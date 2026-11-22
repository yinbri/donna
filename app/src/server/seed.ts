import type { DbSeedFn } from "wasp/server";
import { FIXTURE_ROLES } from "./fixtures";

export const seedDev: DbSeedFn = async (prisma) => {
  for (const role of FIXTURE_ROLES) {
    const data = {
      title: role.title,
      companyName: role.companyName,
      founderName: role.founderName,
      rubric: JSON.stringify(role.rubric),
      questions: JSON.stringify(role.questions),
      sourceUrl: role.sourceUrl,
      isOfficialPosting: role.isOfficialPosting,
    };
    await prisma.role.upsert({ where: { id: role.id }, create: { id: role.id, ...data }, update: data });
  }
};
