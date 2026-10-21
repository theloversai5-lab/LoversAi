import test from "node:test";
import assert from "node:assert/strict";
import { physicalHash, physicalInputs, validatePhysicalCapture, requireCurrentPhysical } from "../physical-capture.js";
import { prepareMeasuredScene, geometryGlb, sceneHash } from "../scene3d.js";
import { designHash } from "../fingerprints.js";
import { buildShotPlan } from "../flow-shot.js";
import { flowDeliveryStatus } from "../flow-delivery.js";
import { PipelineService } from "../service.js";
import { MemoryRepository } from "./helpers.js";

function fixture() {
  const project = { _id: "physical-fixture", ownerId: "owner", revision: 0,
    collaborators: ["vendor"], activeJobs: [], brief: {description: "Synthetic verification fixture"}, canvas: null,
    physicalCapture: null, components: [{id: "stage", category: "stage", description: "Measured proxy",
      dimensions: {width: 2, depth: 2, height: 1, unit: "m"}, masterAssetId: "master"}],
    assets: [{id: "master", kind: "component_sheet", status: "approved", hash: "master-hash"}] };
  project.assets.push({id: "geometry", kind: "geometry_data", status: "approved", sha256: "geometry-hash",
    physicalOperation: "venue_reconstruction", sourcePhysicalHash: physicalHash(project, "venue_reconstruction")});
  project.scene3d = {geometryAssetId: "geometry", frame: {originVertex: 0, xAxisVertex: 1, planeVertex: 2},
    scale: {vertexA: 0, vertexB: 1, metres: 20, method: "tape"},
    placements: [{id: "stage-main", componentId: "stage", position: [8, 0, 8], rotationYDeg: 25}],
    keepClear: [{id: "exit", min: [0, 0], max: [2, 20]}],
    camera: {position: [10, 12, 25], target: [10, 0, 10], verticalFovDeg: 60}, hdrAssetId: null, clearanceMetres: .5};
  const geometry = {formatVersion: 1, vertices: [[-10,0,-10],[10,0,-10],[-10,0,10],[10,0,10]],
    faces: [[0,2,1],[1,2,3]], colors: Array.from({length: 4}, () => [.2,.5,.2]), cameraPoses: []};
  return {project, geometry};
}

test("physical contracts reject foreign roles, short HDR span and duplicate capture bytes", () => {
  const {project} = fixture();
  project.assets.push(...[0,1,2].map(i => ({id:`e${i}`,kind:"exposure",status:"approved",hash:"same",width:640,height:512})));
  const hdr = {assetIds:["e0","e1","e2"],exposureSeconds:[.01,.02,.04],iso:100,fNumber:8,cameraId:"fixed",
    whiteBalance:"locked",cameraPosition:"fixed",sceneMotion:"static"};
  project.physicalCapture=validatePhysicalCapture({hdr},project);
  assert.throws(() => physicalInputs(project,"hdr_merge"), {code:"DUPLICATE_IMAGE"});
  assert.throws(() => validatePhysicalCapture({hdr:{...hdr,exposureSeconds:[.01,.015,.02]}},project),{code:"INVALID_PHYSICAL_CAPTURE"});
  assert.throws(() => validatePhysicalCapture({hdr:{...hdr,assetIds:["master","e1","e2"]}},project),{code:"INVALID_PHYSICAL_CAPTURE"});
});

test("physical output freshness changes with source approval or bracket settings", () => {
  const {project}=fixture();
  project.assets.push(...[0,1,2].map(i=>({id:`e${i}`,kind:"exposure",status:"approved",hash:`h${i}`,width:640,height:512})));
  project.physicalCapture={hdr:{assetIds:["e0","e1","e2"],exposureSeconds:[.01,.04,.16]}};
  const output={physicalOperation:"hdr_merge",sourcePhysicalHash:physicalHash(project,"hdr_merge")};
  requireCurrentPhysical(project,output);
  project.assets.find(a=>a.id==="e0").status="review";
  assert.throws(()=>requireCurrentPhysical(project,output),{code:"STALE_PHYSICAL_CAPTURE"});
});

test("measured frame uses actual geometry and metre-based proxies", () => {
  const {project,geometry}=fixture();
  const scene=prepareMeasuredScene(project,geometry);
  assert.deepEqual(scene.vertices[0],[0,0,0]);
  assert.deepEqual(scene.vertices[3],[20,0,20]);
  assert.equal(scene.placements[0].masterAssetId,"master");
  assert.equal(scene.manifest.accuracyVerified,false);
  const glb=geometryGlb(scene);
  assert.equal(glb.readUInt32LE(0),0x46546c67);
  assert.equal(glb.readUInt32LE(8),glb.length);
  const json=JSON.parse(glb.subarray(20,20+glb.readUInt32LE(12)).toString("utf8"));
  assert.equal(json.meshes.length,2);
  assert.equal(json.nodes[1].extras.componentId,"stage");
  assert.ok(Math.abs(Math.hypot(...json.nodes.at(-1).rotation)-1)<1e-6);
});

test("scene rejects colliding proxies, protected zones, degenerate scale and stale geometry", () => {
  for (const [mutate,code] of [
    [p=>p.scene3d.placements.push({...p.scene3d.placements[0],id:"second"}),"SCENE_COMPONENT_COLLISION"],
    [p=>p.scene3d.placements[0].position=[2.5,0,8],"SCENE_KEEP_CLEAR_CONFLICT"],
    [p=>p.scene3d.scale.vertexB=0,"INVALID_SCENE_SCALE"],
    [p=>p.assets[1].sourcePhysicalHash="old","STALE_PHYSICAL_CAPTURE"],
  ]) {
    const {project,geometry}=fixture(); mutate(project);
    assert.throws(()=>prepareMeasuredScene(project,geometry),{code});
  }
});

test("shot changes invalidate handoffs without invalidating an approved start image", () => {
  const {project}=fixture();
  const before=designHash(project), sceneBefore=sceneHash(project), shotBefore=buildShotPlan(project);
  project.flowShot={motion:"static",durationSeconds:8,angleDegrees:15,travelMetres:1};
  assert.equal(designHash(project),before);
  assert.equal(sceneHash(project),sceneBefore);
  assert.notEqual(buildShotPlan(project).shotPlanHash,shotBefore.shotPlanHash);
  assert.equal(buildShotPlan(project).approximateTravelMetres,0);
  project.scene3d.camera.position=[10,12,10];
  assert.doesNotThrow(()=>buildShotPlan(project));
  project.flowShot.motion="gentle_orbit";
  assert.throws(()=>buildShotPlan(project),{code:"INVALID_FLOW_SHOT"});
});

test("owner-only shot writes reject unusable paths before saving", async () => {
  const {project}=fixture(); project.scene3d.camera.position=[10,12,10];
  const repository=new MemoryRepository(); await repository.createProject(project);
  const service=new PipelineService({repository,assets:{},gemini:{}});
  const shot={motion:"gentle_orbit",durationSeconds:8,angleDegrees:15,travelMetres:1};
  await assert.rejects(service.setFlowShot(project._id,{_id:"vendor"},0,shot),{code:"OWNER_REQUIRED"});
  await assert.rejects(service.setFlowShot(project._id,{_id:"owner"},0,shot),{code:"INVALID_FLOW_SHOT"});
  assert.equal((await repository.getProject(project._id)).revision,0);
});

test("delivery readiness requires all continuity checks and current shot", () => {
  const {project}=fixture(); const hash=designHash(project), shot=buildShotPlan(project).shotPlanHash;
  project.assets.push({id:"handoff",kind:"flow_handoff",status:"approved",sourceDesignHash:hash,sourceShotHash:shot},
    {id:"video",kind:"flow_video",status:"approved",handoffAssetId:"handoff",contactSheetAssetId:"contact",sourceDesignHash:hash,
      review:{decision:"approve",checks:{venuePreserved:true,componentIdentity:true,placementAndClearance:true,motionContinuity:true}}},
    {id:"contact",kind:"flow_contact_sheet",status:"approved",parentAssetId:"video"});
  assert.equal(flowDeliveryStatus(project).status,"approved_delivery");
  project.assets.find(a=>a.id==="video").review.checks.motionContinuity=false;
  assert.equal(flowDeliveryStatus(project).videos[0].readyForDelivery,false);
  project.flowShot={motion:"static",durationSeconds:8,angleDegrees:15,travelMetres:1};
  assert.equal(flowDeliveryStatus(project).videos[0].current,false);
});
