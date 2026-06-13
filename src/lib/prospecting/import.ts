import { db } from "@/lib/db";
import type { FoundPerson } from "./apollo";

/**
 * Upsert found people as the user's prospects and attach them to a list.
 * Shared by the Find Leads manual import and the Instantly enrichment import.
 */
export async function importFoundProspects(
  userId: string,
  listId: string,
  prospects: FoundPerson[],
  source = "finder"
): Promise<number> {
  let imported = 0;
  for (const p of prospects) {
    if (!p.email) continue;
    const prospect = await db.prospect.upsert({
      where: { userId_email: { userId, email: p.email } },
      update: {
        firstName: p.firstName || undefined,
        lastName: p.lastName || undefined,
        companyName: p.companyName || undefined,
        jobTitle: p.jobTitle || undefined,
        industry: p.industry || undefined,
        location: p.location || undefined,
        linkedinUrl: p.linkedinUrl || undefined,
      },
      create: {
        userId,
        email: p.email,
        firstName: p.firstName,
        lastName: p.lastName,
        companyName: p.companyName,
        jobTitle: p.jobTitle,
        industry: p.industry,
        location: p.location,
        linkedinUrl: p.linkedinUrl,
        source,
      },
    });
    await db.prospectListEntry.upsert({
      where: { prospectId_prospectListId: { prospectId: prospect.id, prospectListId: listId } },
      update: {},
      create: { prospectId: prospect.id, prospectListId: listId },
    });
    imported++;
  }
  return imported;
}
