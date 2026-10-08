"use server";

import { prisma } from "@/lib/db";
import { requireUser, requireCampaignAccess, requireCampaignOwner, requireCharacterOwner } from "@/lib/auth";
import { extractTokens } from "@/lib/parser";
import { DEFAULT_SAVING_THROWS, DEFAULT_SKILLS, COINS, COIN_VALUE_CP, type Coin, SLOT_LEVELS } from "@/lib/dnd";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function num(v: FormDataEntryValue | null, fallback = 0): number {
  const n = parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : fallback;
}

function int(v: FormDataEntryValue | null, fallback = 0): number {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
}

function clampAbility(v: FormDataEntryValue | null, fallback = 10): number {
  return Math.min(20, Math.max(3, int(v, fallback)));
}

function bool(v: FormDataEntryValue | null): boolean {
  return v != null;
}

/* ---------- Campaigns ---------- */

export async function createCampaign(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") || "").trim() || "New Campaign";
  const c = await prisma.campaign.create({
    data: {
      name,
      ownerId: user.id,
      memberships: { create: { userId: user.id, role: "OWNER" } },
    },
  });
  redirect(`/campaign/${c.id}/notes`);
}

export async function deleteCampaign(id: string) {
  const user = await requireUser();
  await requireCampaignOwner(id, user.id);
  await prisma.campaign.delete({ where: { id } });
  revalidatePath("/");
}

export async function setCapacities(campaignId: string, formData: FormData) {
  const user = await requireUser();
  await requireCampaignAccess(campaignId, user.id);
  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      carryCapacitySelf: num(formData.get("self"), 150),
      carryCapacityHorse: num(formData.get("horse"), 480),
    },
  });
  revalidatePath(`/campaign/${campaignId}/equipment`);
}

/* ---------- Campaign membership / invites ---------- */

export async function joinCampaign(code: string) {
  const user = await requireUser();
  const campaign = await prisma.campaign.findUnique({ where: { inviteCode: code } });
  if (!campaign) throw new Error("Invite not found");

  await prisma.campaignMembership.upsert({
    where: { campaignId_userId: { campaignId: campaign.id, userId: user.id } },
    update: {},
    create: { campaignId: campaign.id, userId: user.id, role: "MEMBER" },
  });

  redirect(`/campaign/${campaign.id}/notes`);
}

/* ---------- Notes ---------- */

export async function createNote(campaignId: string) {
  const user = await requireUser();
  await requireCampaignAccess(campaignId, user.id);
  const n = await prisma.note.create({ data: { campaignId, title: "Untitled", authorId: user.id } });
  redirect(`/campaign/${campaignId}/notes/${n.id}`);
}

export async function deleteNote(noteId: string, campaignId: string) {
  const user = await requireUser();
  await requireCampaignAccess(campaignId, user.id);
  await prisma.note.delete({ where: { id: noteId } });
  redirect(`/campaign/${campaignId}/notes`);
}

// Called from the client editor. Parses tokens, upserts entities, links them.
export async function saveNote(noteId: string, campaignId: string, title: string, body: string) {
  const user = await requireUser();
  await requireCampaignAccess(campaignId, user.id);

  const tokens = extractTokens(body);
  const linkIds: { id: string }[] = [];

  for (const t of tokens) {
    const e = await prisma.entity.upsert({
      where: { campaignId_type_name: { campaignId, type: t.type, name: t.name } },
      update: {},
      create: { campaignId, type: t.type, name: t.name },
    });
    linkIds.push({ id: e.id });
  }

  await prisma.note.update({
    where: { id: noteId },
    data: {
      title: title.trim() || "Untitled",
      body,
      links: { set: linkIds }, // replace links with the current set
    },
  });

  revalidatePath(`/campaign/${campaignId}/notes/${noteId}`);
  revalidatePath(`/campaign/${campaignId}/notes`);
  revalidatePath(`/campaign/${campaignId}/entities/characters`);
  revalidatePath(`/campaign/${campaignId}/entities/places`);
  revalidatePath(`/campaign/${campaignId}/entities/items`);
}

/* ---------- Entities (characters / places / items) ---------- */

export async function createEntity(campaignId: string, kindType: string, formData: FormData) {
  const user = await requireUser();
  await requireCampaignAccess(campaignId, user.id);
  const name = String(formData.get("name") || "").trim();
  if (!name) return;
  await prisma.entity.upsert({
    where: { campaignId_type_name: { campaignId, type: kindType, name } },
    update: {},
    create: { campaignId, type: kindType, name },
  });
  revalidatePath(`/campaign/${campaignId}`);
}

export async function updateEntity(entityId: string, campaignId: string, formData: FormData) {
  const user = await requireUser();
  await requireCampaignAccess(campaignId, user.id);
  await prisma.entity.update({
    where: { id: entityId },
    data: {
      name: String(formData.get("name") || "").trim() || "Unnamed",
      description: String(formData.get("description") || ""),
      details: String(formData.get("details") || ""),
    },
  });
  revalidatePath(`/campaign/${campaignId}/entity/${entityId}`);
}

export async function deleteEntity(entityId: string, campaignId: string, backTo: string) {
  const user = await requireUser();
  await requireCampaignAccess(campaignId, user.id);
  await prisma.entity.delete({ where: { id: entityId } });
  redirect(`/campaign/${campaignId}/entities/${backTo}`);
}

/* ---------- Inventory / Equipment ---------- */

export async function addItem(campaignId: string, formData: FormData) {
  const user = await requireUser();
  await requireCampaignAccess(campaignId, user.id);
  const name = String(formData.get("name") || "").trim();
  if (!name) return;
  await prisma.inventoryItem.create({
    data: {
      campaignId,
      name,
      description: String(formData.get("description") || ""),
      worth: num(formData.get("worth")),
      weightLbs: num(formData.get("weightLbs")),
      quantity: Math.max(1, Math.round(num(formData.get("quantity"), 1))),
      location: String(formData.get("location")) === "HORSE" ? "HORSE" : "SELF",
    },
  });
  revalidatePath(`/campaign/${campaignId}/equipment`);
}

export async function updateItem(itemId: string, campaignId: string, formData: FormData) {
  const user = await requireUser();
  await requireCampaignAccess(campaignId, user.id);
  await prisma.inventoryItem.update({
    where: { id: itemId },
    data: {
      name: String(formData.get("name") || "").trim() || "Item",
      description: String(formData.get("description") || ""),
      worth: num(formData.get("worth")),
      weightLbs: num(formData.get("weightLbs")),
      quantity: Math.max(1, Math.round(num(formData.get("quantity"), 1))),
      location: String(formData.get("location")) === "HORSE" ? "HORSE" : "SELF",
    },
  });
  revalidatePath(`/campaign/${campaignId}/equipment`);
}

export async function moveItem(itemId: string, campaignId: string, location: string) {
  const user = await requireUser();
  await requireCampaignAccess(campaignId, user.id);
  await prisma.inventoryItem.update({
    where: { id: itemId },
    data: { location: location === "HORSE" ? "HORSE" : "SELF" },
  });
  revalidatePath(`/campaign/${campaignId}/equipment`);
}

export async function deleteItem(itemId: string, campaignId: string) {
  const user = await requireUser();
  await requireCampaignAccess(campaignId, user.id);
  const item = await prisma.inventoryItem.delete({ where: { id: itemId } });
  // remember its info so it can be re-added later without retyping it
  if (item.name.trim()) {
    await prisma.itemTemplate.upsert({
      where: { campaignId_name: { campaignId, name: item.name } },
      create: {
        campaignId,
        name: item.name,
        description: item.description,
        worth: item.worth,
        weightLbs: item.weightLbs,
      },
      update: {
        description: item.description,
        worth: item.worth,
        weightLbs: item.weightLbs,
      },
    });
  }
  revalidatePath(`/campaign/${campaignId}/equipment`);
}

/* ---------- Saved item templates ---------- */

export async function addItemFromTemplate(templateId: string, campaignId: string, formData: FormData) {
  const user = await requireUser();
  await requireCampaignAccess(campaignId, user.id);
  const template = await prisma.itemTemplate.findUnique({ where: { id: templateId } });
  if (!template) return;
  await prisma.inventoryItem.create({
    data: {
      campaignId,
      name: template.name,
      description: template.description,
      worth: template.worth,
      weightLbs: template.weightLbs,
      quantity: Math.max(1, Math.round(num(formData.get("quantity"), 1))),
      location: String(formData.get("location")) === "HORSE" ? "HORSE" : "SELF",
    },
  });
  revalidatePath(`/campaign/${campaignId}/equipment`);
}

export async function deleteItemTemplate(templateId: string, campaignId: string) {
  const user = await requireUser();
  await requireCampaignAccess(campaignId, user.id);
  await prisma.itemTemplate.delete({ where: { id: templateId } });
  revalidatePath(`/campaign/${campaignId}/equipment`);
}

/* ---------- Character sheet ---------- */

// One character per (campaign, member); created on first visit to the tab.
export async function getOrCreateCharacter(campaignId: string, userId: string) {
  const existing = await prisma.character.findUnique({
    where: { campaignId_userId: { campaignId, userId } },
    include: {
      languages: true,
      proficiencies: true,
      features: true,
      savingThrows: true,
      skills: true,
      attacks: true,
      spells: true,
      spellSlots: true,
    },
  });
  if (existing) {
    const missingLevels = SLOT_LEVELS.filter((level) => !existing.spellSlots.some((s) => s.level === level));
    if (missingLevels.length === 0) return existing;
    await prisma.spellSlot.createMany({
      data: missingLevels.map((level) => ({ characterId: existing.id, level, total: 0, used: 0 })),
    });
    return { ...existing, spellSlots: [...existing.spellSlots, ...missingLevels.map((level) => ({ id: "", level, total: 0, used: 0, characterId: existing.id }))].sort((a, b) => a.level - b.level) };
  }

  return prisma.character.create({
    data: {
      campaignId,
      userId,
      savingThrows: { create: DEFAULT_SAVING_THROWS.map((name) => ({ name, value: 0 })) },
      skills: { create: DEFAULT_SKILLS.map((name) => ({ name, value: 0 })) },
      spellSlots: { create: SLOT_LEVELS.map((level) => ({ level, total: 0, used: 0 })) },
    },
    include: {
      languages: true,
      proficiencies: true,
      features: true,
      savingThrows: true,
      skills: true,
      attacks: true,
      spells: true,
      spellSlots: true,
    },
  });
}

export async function updateCharacterInfo(characterId: string, campaignId: string, formData: FormData) {
  const user = await requireUser();
  await requireCharacterOwner(characterId, user.id);
  await prisma.character.update({
    where: { id: characterId },
    data: {
      name: String(formData.get("name") || "").trim(),
      className: String(formData.get("className") || "").trim(),
      background: String(formData.get("background") || "").trim(),
      alignment: String(formData.get("alignment") || "").trim(),
      experiencePoints: Math.max(0, int(formData.get("experiencePoints"))),
      level: Math.max(1, int(formData.get("level"), 1)),
    },
  });
  revalidatePath(`/campaign/${campaignId}/character`);
}

export async function updateCharacterCombat(characterId: string, campaignId: string, formData: FormData) {
  const user = await requireUser();
  await requireCharacterOwner(characterId, user.id);
  await prisma.character.update({
    where: { id: characterId },
    data: {
      armorClass: int(formData.get("armorClass"), 10),
      speed: int(formData.get("speed"), 30),
      passivePerception: int(formData.get("passivePerception"), 10),
      proficiencyBonus: int(formData.get("proficiencyBonus"), 2),
      hitDice: String(formData.get("hitDice") || "").trim(),
      maxHp: Math.max(0, int(formData.get("maxHp"))),
      tempHp: Math.max(0, int(formData.get("tempHp"))),
      currentHp: int(formData.get("currentHp")),
    },
  });
  revalidatePath(`/campaign/${campaignId}/character`);
}

// Kept separate from updateCharacterCombat: this one gets set at the start of every fight.
export async function setInitiative(characterId: string, campaignId: string, formData: FormData) {
  const user = await requireUser();
  await requireCharacterOwner(characterId, user.id);
  await prisma.character.update({
    where: { id: characterId },
    data: { initiative: int(formData.get("initiative")) },
  });
  revalidatePath(`/campaign/${campaignId}/character`);
}

export async function updateCharacterStats(characterId: string, campaignId: string, formData: FormData) {
  const user = await requireUser();
  await requireCharacterOwner(characterId, user.id);
  await prisma.character.update({
    where: { id: characterId },
    data: {
      strength: clampAbility(formData.get("strength")),
      dexterity: clampAbility(formData.get("dexterity")),
      constitution: clampAbility(formData.get("constitution")),
      intelligence: clampAbility(formData.get("intelligence")),
      wisdom: clampAbility(formData.get("wisdom")),
      charisma: clampAbility(formData.get("charisma")),
    },
  });
  revalidatePath(`/campaign/${campaignId}/character`);
}

/* ---------- Character: languages / proficiencies (simple tag lists) ---------- */

export async function addLanguage(characterId: string, campaignId: string, formData: FormData) {
  const user = await requireUser();
  await requireCharacterOwner(characterId, user.id);
  const name = String(formData.get("name") || "").trim();
  if (!name) return;
  await prisma.characterLanguage.create({ data: { characterId, name } });
  revalidatePath(`/campaign/${campaignId}/character`);
}

export async function deleteLanguage(id: string, campaignId: string) {
  const user = await requireUser();
  const language = await prisma.characterLanguage.findUnique({ where: { id } });
  if (!language) return;
  await requireCharacterOwner(language.characterId, user.id);
  await prisma.characterLanguage.delete({ where: { id } });
  revalidatePath(`/campaign/${campaignId}/character`);
}

export async function addProficiency(characterId: string, campaignId: string, formData: FormData) {
  const user = await requireUser();
  await requireCharacterOwner(characterId, user.id);
  const name = String(formData.get("name") || "").trim();
  if (!name) return;
  await prisma.characterProficiency.create({ data: { characterId, name } });
  revalidatePath(`/campaign/${campaignId}/character`);
}

export async function deleteProficiency(id: string, campaignId: string) {
  const user = await requireUser();
  const proficiency = await prisma.characterProficiency.findUnique({ where: { id } });
  if (!proficiency) return;
  await requireCharacterOwner(proficiency.characterId, user.id);
  await prisma.characterProficiency.delete({ where: { id } });
  revalidatePath(`/campaign/${campaignId}/character`);
}

/* ---------- Character: features & traits ---------- */

export async function addFeature(characterId: string, campaignId: string, formData: FormData) {
  const user = await requireUser();
  await requireCharacterOwner(characterId, user.id);
  const name = String(formData.get("name") || "").trim();
  if (!name) return;
  await prisma.characterFeature.create({
    data: { characterId, name, description: String(formData.get("description") || "") },
  });
  revalidatePath(`/campaign/${campaignId}/character`);
}

export async function updateFeature(id: string, campaignId: string, formData: FormData) {
  const user = await requireUser();
  const feature = await prisma.characterFeature.findUnique({ where: { id } });
  if (!feature) return;
  await requireCharacterOwner(feature.characterId, user.id);
  await prisma.characterFeature.update({
    where: { id },
    data: {
      name: String(formData.get("name") || "").trim() || "Untitled",
      description: String(formData.get("description") || ""),
    },
  });
  revalidatePath(`/campaign/${campaignId}/character`);
}

export async function deleteFeature(id: string, campaignId: string) {
  const user = await requireUser();
  const feature = await prisma.characterFeature.findUnique({ where: { id } });
  if (!feature) return;
  await requireCharacterOwner(feature.characterId, user.id);
  await prisma.characterFeature.delete({ where: { id } });
  revalidatePath(`/campaign/${campaignId}/character`);
}

/* ---------- Character: saving throws ---------- */

export async function addSavingThrow(characterId: string, campaignId: string, formData: FormData) {
  const user = await requireUser();
  await requireCharacterOwner(characterId, user.id);
  const name = String(formData.get("name") || "").trim();
  if (!name) return;
  await prisma.savingThrow.create({ data: { characterId, name, value: int(formData.get("value")) } });
  revalidatePath(`/campaign/${campaignId}/character`);
}

export async function updateSavingThrow(id: string, campaignId: string, formData: FormData) {
  const user = await requireUser();
  const savingThrow = await prisma.savingThrow.findUnique({ where: { id } });
  if (!savingThrow) return;
  await requireCharacterOwner(savingThrow.characterId, user.id);
  await prisma.savingThrow.update({
    where: { id },
    data: { name: String(formData.get("name") || "").trim() || "Untitled", value: int(formData.get("value")) },
  });
  revalidatePath(`/campaign/${campaignId}/character`);
}

export async function deleteSavingThrow(id: string, campaignId: string) {
  const user = await requireUser();
  const savingThrow = await prisma.savingThrow.findUnique({ where: { id } });
  if (!savingThrow) return;
  await requireCharacterOwner(savingThrow.characterId, user.id);
  await prisma.savingThrow.delete({ where: { id } });
  revalidatePath(`/campaign/${campaignId}/character`);
}

/* ---------- Character: skills ---------- */

export async function addSkill(characterId: string, campaignId: string, formData: FormData) {
  const user = await requireUser();
  await requireCharacterOwner(characterId, user.id);
  const name = String(formData.get("name") || "").trim();
  if (!name) return;
  await prisma.skill.create({ data: { characterId, name, value: int(formData.get("value")) } });
  revalidatePath(`/campaign/${campaignId}/character`);
}

export async function updateSkill(id: string, campaignId: string, formData: FormData) {
  const user = await requireUser();
  const skill = await prisma.skill.findUnique({ where: { id } });
  if (!skill) return;
  await requireCharacterOwner(skill.characterId, user.id);
  await prisma.skill.update({
    where: { id },
    data: { name: String(formData.get("name") || "").trim() || "Untitled", value: int(formData.get("value")) },
  });
  revalidatePath(`/campaign/${campaignId}/character`);
}

export async function deleteSkill(id: string, campaignId: string) {
  const user = await requireUser();
  const skill = await prisma.skill.findUnique({ where: { id } });
  if (!skill) return;
  await requireCharacterOwner(skill.characterId, user.id);
  await prisma.skill.delete({ where: { id } });
  revalidatePath(`/campaign/${campaignId}/character`);
}

/* ---------- Character: death saving throws ---------- */

export async function updateDeathSaves(characterId: string, campaignId: string, formData: FormData) {
  const user = await requireUser();
  await requireCharacterOwner(characterId, user.id);
  const successes = Math.min(3, formData.getAll("success").length);
  const failures = Math.min(3, formData.getAll("failure").length);
  await prisma.character.update({
    where: { id: characterId },
    data: { deathSaveSuccesses: successes, deathSaveFailures: failures },
  });
  revalidatePath(`/campaign/${campaignId}/character`);
}

export async function resetDeathSaves(characterId: string, campaignId: string) {
  const user = await requireUser();
  await requireCharacterOwner(characterId, user.id);
  await prisma.character.update({
    where: { id: characterId },
    data: { deathSaveSuccesses: 0, deathSaveFailures: 0 },
  });
  revalidatePath(`/campaign/${campaignId}/character`);
}

/* ---------- Character: attacks & spellcasting ---------- */

export async function addAttack(characterId: string, campaignId: string, formData: FormData) {
  const user = await requireUser();
  await requireCharacterOwner(characterId, user.id);
  const name = String(formData.get("name") || "").trim();
  if (!name) return;
  await prisma.attack.create({
    data: {
      characterId,
      name,
      attackBonus: String(formData.get("attackBonus") || "").trim(),
      damage: String(formData.get("damage") || "").trim(),
      type: String(formData.get("type") || "").trim(),
    },
  });
  revalidatePath(`/campaign/${campaignId}/character`);
}

export async function updateAttack(id: string, campaignId: string, formData: FormData) {
  const user = await requireUser();
  const attack = await prisma.attack.findUnique({ where: { id } });
  if (!attack) return;
  await requireCharacterOwner(attack.characterId, user.id);
  await prisma.attack.update({
    where: { id },
    data: {
      name: String(formData.get("name") || "").trim() || "Untitled",
      attackBonus: String(formData.get("attackBonus") || "").trim(),
      damage: String(formData.get("damage") || "").trim(),
      type: String(formData.get("type") || "").trim(),
    },
  });
  revalidatePath(`/campaign/${campaignId}/character`);
}

export async function deleteAttack(id: string, campaignId: string) {
  const user = await requireUser();
  const attack = await prisma.attack.findUnique({ where: { id } });
  if (!attack) return;
  await requireCharacterOwner(attack.characterId, user.id);
  await prisma.attack.delete({ where: { id } });
  revalidatePath(`/campaign/${campaignId}/character`);
}

/* ---------- Character: spellcasting ---------- */

export async function updateSpellcasting(characterId: string, campaignId: string, formData: FormData) {
  const user = await requireUser();
  await requireCharacterOwner(characterId, user.id);
  await prisma.character.update({
    where: { id: characterId },
    data: {
      spellcastingAbility: String(formData.get("spellcastingAbility") || "").trim(),
      spellSaveDc: int(formData.get("spellSaveDc")),
      spellAttackBonus: String(formData.get("spellAttackBonus") || "").trim(),
    },
  });
  revalidatePath(`/campaign/${campaignId}/spells`);
}

export async function addSpell(characterId: string, campaignId: string, formData: FormData) {
  const user = await requireUser();
  await requireCharacterOwner(characterId, user.id);
  const name = String(formData.get("name") || "").trim();
  if (!name) return;
  await prisma.spell.create({
    data: {
      characterId,
      name,
      level: Math.min(9, Math.max(0, int(formData.get("level")))),
      description: String(formData.get("description") || ""),
      range: String(formData.get("range") || "").trim(),
      castingTime: String(formData.get("castingTime") || "").trim(),
      duration: String(formData.get("duration") || "").trim(),
      concentration: bool(formData.get("concentration")),
      ritual: bool(formData.get("ritual")),
      verbal: bool(formData.get("verbal")),
      somatic: bool(formData.get("somatic")),
      material: bool(formData.get("material")),
      materialDescription: String(formData.get("materialDescription") || "").trim(),
      notes: String(formData.get("notes") || ""),
    },
  });
  revalidatePath(`/campaign/${campaignId}/spells`);
}

export async function updateSpell(id: string, campaignId: string, formData: FormData) {
  const user = await requireUser();
  const spell = await prisma.spell.findUnique({ where: { id } });
  if (!spell) return;
  await requireCharacterOwner(spell.characterId, user.id);
  await prisma.spell.update({
    where: { id },
    data: {
      name: String(formData.get("name") || "").trim() || "Untitled",
      level: Math.min(9, Math.max(0, int(formData.get("level")))),
      description: String(formData.get("description") || ""),
      range: String(formData.get("range") || "").trim(),
      castingTime: String(formData.get("castingTime") || "").trim(),
      duration: String(formData.get("duration") || "").trim(),
      concentration: bool(formData.get("concentration")),
      ritual: bool(formData.get("ritual")),
      verbal: bool(formData.get("verbal")),
      somatic: bool(formData.get("somatic")),
      material: bool(formData.get("material")),
      materialDescription: String(formData.get("materialDescription") || "").trim(),
      notes: String(formData.get("notes") || ""),
    },
  });
  revalidatePath(`/campaign/${campaignId}/spells`);
}

export async function deleteSpell(id: string, campaignId: string) {
  const user = await requireUser();
  const existing = await prisma.spell.findUnique({ where: { id } });
  if (!existing) return;
  await requireCharacterOwner(existing.characterId, user.id);

  const spell = await prisma.spell.delete({ where: { id } });
  // remember its info so it can be re-added later without retyping it
  if (spell.name.trim()) {
    const data = {
      level: spell.level,
      description: spell.description,
      range: spell.range,
      castingTime: spell.castingTime,
      duration: spell.duration,
      concentration: spell.concentration,
      ritual: spell.ritual,
      verbal: spell.verbal,
      somatic: spell.somatic,
      material: spell.material,
      materialDescription: spell.materialDescription,
      notes: spell.notes,
    };
    await prisma.spellTemplate.upsert({
      where: { campaignId_name: { campaignId, name: spell.name } },
      create: { campaignId, name: spell.name, ...data },
      update: data,
    });
  }
  revalidatePath(`/campaign/${campaignId}/spells`);
}

/* ---------- Saved spell templates ---------- */

export async function addSpellFromTemplate(templateId: string, characterId: string, campaignId: string) {
  const user = await requireUser();
  await requireCharacterOwner(characterId, user.id);
  const template = await prisma.spellTemplate.findUnique({ where: { id: templateId } });
  if (!template) return;
  await prisma.spell.create({
    data: {
      characterId,
      name: template.name,
      level: template.level,
      description: template.description,
      range: template.range,
      castingTime: template.castingTime,
      duration: template.duration,
      concentration: template.concentration,
      ritual: template.ritual,
      verbal: template.verbal,
      somatic: template.somatic,
      material: template.material,
      materialDescription: template.materialDescription,
      notes: template.notes,
    },
  });
  revalidatePath(`/campaign/${campaignId}/spells`);
}

export async function deleteSpellTemplate(templateId: string, campaignId: string) {
  const user = await requireUser();
  await requireCampaignAccess(campaignId, user.id);
  await prisma.spellTemplate.delete({ where: { id: templateId } });
  revalidatePath(`/campaign/${campaignId}/spells`);
}

/* ---------- Character: spell slots ---------- */

export async function updateSpellSlots(characterId: string, campaignId: string, formData: FormData) {
  const user = await requireUser();
  await requireCharacterOwner(characterId, user.id);
  for (const level of SLOT_LEVELS) {
    const total = Math.max(0, int(formData.get(`total-${level}`)));
    const remaining = Math.min(total, Math.max(0, int(formData.get(`remaining-${level}`), total)));
    const used = total - remaining;
    await prisma.spellSlot.upsert({
      where: { characterId_level: { characterId, level } },
      update: { total, used },
      create: { characterId, level, total, used },
    });
  }
  revalidatePath(`/campaign/${campaignId}/spells`);
}

export async function resetSpellSlots(characterId: string, campaignId: string) {
  const user = await requireUser();
  await requireCharacterOwner(characterId, user.id);
  await prisma.spellSlot.updateMany({ where: { characterId }, data: { used: 0 } });
  revalidatePath(`/campaign/${campaignId}/spells`);
}

/* ---------- Currency ---------- */

function isCoin(x: string): x is Coin {
  return (COINS as readonly string[]).includes(x);
}

export async function updateCoins(characterId: string, campaignId: string, formData: FormData) {
  const user = await requireUser();
  await requireCharacterOwner(characterId, user.id);
  await prisma.character.update({
    where: { id: characterId },
    data: {
      platinum: Math.max(0, int(formData.get("platinum"))),
      gold: Math.max(0, int(formData.get("gold"))),
      electrum: Math.max(0, int(formData.get("electrum"))),
      silver: Math.max(0, int(formData.get("silver"))),
      copper: Math.max(0, int(formData.get("copper"))),
    },
  });
  revalidatePath(`/campaign/${campaignId}/currency`);
}

// Exchanges `amount` of one coin type for as many of another as it's worth.
export async function convertCoins(characterId: string, campaignId: string, formData: FormData) {
  const user = await requireUser();
  await requireCharacterOwner(characterId, user.id);

  const amount = Math.max(0, int(formData.get("amount")));
  const from = String(formData.get("from") || "");
  const to = String(formData.get("to") || "");
  if (amount <= 0 || !isCoin(from) || !isCoin(to) || from === to) return;

  const character = await prisma.character.findUnique({ where: { id: characterId } });
  if (!character || character[from] < amount) return;

  const converted = Math.floor((amount * COIN_VALUE_CP[from]) / COIN_VALUE_CP[to]);
  if (converted <= 0) return;

  await prisma.character.update({
    where: { id: characterId },
    data: { [from]: character[from] - amount, [to]: character[to] + converted },
  });
  revalidatePath(`/campaign/${campaignId}/currency`);
}
