export function getCoupleDisplayName(user) {
  const weddingProfile = user?.weddingProfile || {};
  const partnerOne = weddingProfile.partnerName1?.trim();
  const partnerTwo = weddingProfile.partnerName2?.trim();

  if (partnerOne && partnerTwo) return `${partnerOne} & ${partnerTwo}`;
  if (partnerOne) return partnerOne;
  if (partnerTwo) return partnerTwo;
  return user?.fullName || "Couple";
}

export function getCoupleInitials(user) {
  const weddingProfile = user?.weddingProfile || {};
  const first = weddingProfile.partnerName1?.trim()?.[0] || user?.fullName?.trim()?.[0] || "C";
  const second = weddingProfile.partnerName2?.trim()?.[0] || "";
  return second ? `${first}&${second}` : first;
}
