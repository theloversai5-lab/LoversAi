-- Demo Auth users are created by `node supabase/seed-auth-users.mjs`.
-- Apply migrations first, then run this file in the Supabase SQL Editor.
do $$
begin
  if (select count(*) from auth.users where raw_user_meta_data ->> 'demo_seed_key' in (
    'couple-maya','couple-isha','couple-anaya','couple-tara',
    'planner-meera','planner-aarav','planner-naina','planner-zoya',
    'vendor-riya','vendor-kabir','vendor-tara','vendor-dev'
  )) <> 12 then
    raise exception 'Expected 12 demo Auth users. Run node supabase/seed-auth-users.mjs first.';
  end if;
end $$;
insert into public.profiles (id, role, handle, display_name, initials, company_name, city, bio, is_public, is_complete, is_demo)
values
  ((select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'couple-maya'),'couple','maya-and-arjun','Maya & Arjun','MA','','Jaipur','A joyful garden wedding with thoughtful details.',true,true,true),
  ((select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'couple-isha'),'couple','isha-and-rohan','Isha & Rohan','IR','','Mumbai','A warm celebration by the sea.',true,true,true),
  ((select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'couple-anaya'),'couple','anaya-and-kabir','Anaya & Kabir','AK','','Delhi','A classic wedding with bright flowers.',true,true,true),
  ((select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'couple-tara'),'couple','tara-and-neel','Tara & Neel','TN','','Udaipur','A small palace wedding with close family.',true,true,true),
  ((select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'planner-meera'),'planner','meera-events','Meera Shah','MS','Meera Events','Jaipur','Full wedding planning and design.',true,true,true),
  ((select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'planner-aarav'),'planner','the-wedding-edit','Aarav Mehta','AM','The Wedding Edit','Mumbai','Calm plans for joyful celebrations.',true,true,true),
  ((select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'planner-naina'),'planner','olive-and-ivory','Naina Kapoor','NK','Olive & Ivory','Delhi','Thoughtful wedding design and care.',true,true,true),
  ((select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'planner-zoya'),'planner','marigold-moments','Zoya Khan','ZK','Marigold Moments','Udaipur','Local planning with personal touches.',true,true,true),
  ((select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'vendor-riya'),'vendor','eternal-frames','Riya Sen','RS','Eternal Frames','Jaipur','Wedding photography and films.',true,true,true),
  ((select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'vendor-kabir'),'vendor','petal-house','Kabir Rao','KR','Petal House','Mumbai','Flowers and wedding decor.',true,true,true),
  ((select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'vendor-tara'),'vendor','feast-and-fable','Tara Joseph','TJ','Feast & Fable','Delhi','Seasonal food for celebrations.',true,true,true),
  ((select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'vendor-dev'),'vendor','lakeview-estate','Dev Malhotra','DM','Lakeview Estate','Udaipur','A garden venue by the lake.',true,true,true)
on conflict (id) do update set
  role = excluded.role,
  handle = excluded.handle,
  display_name = excluded.display_name,
  initials = excluded.initials,
  company_name = excluded.company_name,
  city = excluded.city,
  bio = excluded.bio,
  is_public = excluded.is_public,
  is_complete = excluded.is_complete,
  is_demo = excluded.is_demo;

insert into public.couple_requirements (profile_id, partner_names, initials, wedding_date, city, guest_count, budget_min, budget_max, services, priorities, notes, visible_to_pros)
values
  ((select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'couple-maya'),'Maya & Arjun','MA','2027-02-18','Jaipur',240,1800000,2600000,array['Planning','Flowers','Photography'],array['Garden ceremony','Family dinner'],'Looking for a warm garden setting.',true),
  ((select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'couple-isha'),'Isha & Rohan','IR','2027-11-06','Mumbai',180,2200000,3200000,array['Planning','Venue','Food'],array['Sea view','Live music'],'Need help finding a sea view venue.',true),
  ((select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'couple-anaya'),'Anaya & Kabir','AK','2027-12-12','Delhi',320,3000000,4500000,array['Decor','Photography','Food'],array['Classic style','Guest comfort'],'Classic colors with fresh flowers.',true),
  ((select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'couple-tara'),'Tara & Neel','TN','2028-01-22','Udaipur',90,1400000,2100000,array['Planning','Venue','Flowers'],array['Small guest list','Lake view'],'A relaxed day with close family.',true)
on conflict (profile_id) do nothing;

insert into public.profile_services (profile_id, service_name, display_order)
values
  ((select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'planner-meera'),'Full planning',1),((select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'planner-meera'),'Wedding design',2),((select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'planner-meera'),'Day coordination',3),
  ((select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'planner-aarav'),'Wedding planning',1),((select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'planner-aarav'),'Guest care',2),
  ((select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'planner-naina'),'Wedding design',1),((select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'planner-naina'),'Full planning',2),
  ((select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'planner-zoya'),'Local planning',1),((select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'planner-zoya'),'Venue search',2),
  ((select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'vendor-riya'),'Photography',1),((select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'vendor-riya'),'Wedding films',2),
  ((select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'vendor-kabir'),'Flower design',1),((select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'vendor-kabir'),'Wedding decor',2),
  ((select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'vendor-tara'),'Wedding meals',1),((select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'vendor-tara'),'Dessert tables',2),
  ((select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'vendor-dev'),'Wedding venue',1),((select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'vendor-dev'),'Garden events',2)
on conflict (profile_id, service_name) do nothing;

insert into public.profile_portfolio (profile_id, image_url, alt_text, display_order)
values
  ((select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'planner-meera'),'/tool-planner.jpg','Wedding planning details',1),
  ((select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'planner-aarav'),'/playground-02-stage.png','Wedding stage design',1),
  ((select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'planner-naina'),'/playground-03-seating.png','Wedding seating design',1),
  ((select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'planner-zoya'),'/empty-lawn-venue.png','Outdoor wedding setting',1),
  ((select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'vendor-riya'),'/tool-couples.jpg','Wedding photography portfolio',1),
  ((select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'vendor-kabir'),'/tool-vendor.jpg','Wedding flower and decor',1),
  ((select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'vendor-tara'),'/playground-01-empty.png','Wedding dining setting',1),
  ((select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'vendor-dev'),'/lawn-venue.png','Outdoor venue portfolio',1),
  ((select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'planner-meera'),'/playground-02-stage.png','Wedding stage planning',2),
  ((select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'planner-meera'),'/playground-03-seating.png','Garden guest seating',3),
  ((select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'planner-aarav'),'/playground-04-decor.png','Wedding decor planning',2),
  ((select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'planner-aarav'),'/empty-lawn-venue.png','Outdoor wedding plan',3),
  ((select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'planner-naina'),'/playground-02-stage.png','Wedding stage design',2),
  ((select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'planner-naina'),'/playground-04-decor.png','Floral wedding details',3),
  ((select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'planner-zoya'),'/playground-03-seating.png','Wedding guest seating',2),
  ((select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'planner-zoya'),'/playground-04-decor.png','Wedding decor details',3),
  ((select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'vendor-riya'),'/playground-02-stage.png','Ceremony photography',2),
  ((select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'vendor-riya'),'/playground-03-seating.png','Garden wedding photos',3),
  ((select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'vendor-kabir'),'/playground-04-decor.png','Floral mandap decor',2),
  ((select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'vendor-kabir'),'/playground-03-seating.png','Wedding table flowers',3),
  ((select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'vendor-tara'),'/tool-couples.jpg','Wedding dining setup',2),
  ((select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'vendor-tara'),'/playground-04-decor.png','Celebration decor',3),
  ((select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'vendor-dev'),'/empty-lawn-venue.png','Garden venue view',2),
  ((select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'vendor-dev'),'/playground-03-seating.png','Outdoor ceremony space',3)
on conflict (profile_id, image_url) do nothing;

insert into public.moodboards (id, profile_id, title, event_type, style, summary, image_urls, is_public)
values
  ('10000000-0000-4000-8000-000000000101',(select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'couple-maya'),'Garden wedding','Wedding','Garden','Warm flowers and open air.',array['/tool-couples.jpg','/playground-03-seating.png'],true),
  ('10000000-0000-4000-8000-000000000102',(select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'couple-isha'),'Seaside celebration','Wedding','Coastal','Soft colors by the sea.',array['/lawn-venue.png'],true),
  ('10000000-0000-4000-8000-000000000103',(select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'couple-anaya'),'Classic wedding','Wedding','Classic','Gold details and fresh blooms.',array['/playground-02-stage.png'],true),
  ('10000000-0000-4000-8000-000000000104',(select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'couple-tara'),'Palace gathering','Wedding','Palace','An intimate palace celebration.',array['/empty-lawn-venue.png'],true)
on conflict (id) do nothing;

insert into public.planner_requests (id, couple_profile_id, moodboard_id, services, priorities, notes, status)
values
  ('20000000-0000-4000-8000-000000000101',(select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'couple-maya'),'10000000-0000-4000-8000-000000000101',array['Planning','Flowers','Photography'],array['Garden ceremony','Family dinner'],'Looking for a warm garden setting.','open'),
  ('20000000-0000-4000-8000-000000000102',(select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'couple-isha'),'10000000-0000-4000-8000-000000000102',array['Planning','Venue','Food'],array['Sea view','Live music'],'Need help finding a sea view venue.','open'),
  ('20000000-0000-4000-8000-000000000103',(select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'couple-anaya'),'10000000-0000-4000-8000-000000000103',array['Decor','Photography','Food'],array['Classic style','Guest comfort'],'Classic colors with fresh flowers.','open'),
  ('20000000-0000-4000-8000-000000000104',(select id from auth.users where raw_user_meta_data ->> 'demo_seed_key' = 'couple-tara'),'10000000-0000-4000-8000-000000000104',array['Planning','Venue','Flowers'],array['Small guest list','Lake view'],'A relaxed day with close family.','open')
on conflict (id) do nothing;
