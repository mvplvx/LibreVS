import { z } from "zod";

export const vsmeMaterialityEnum = z.enum(["material", "non_material"]);

export const materialityItemSchema = z.object({
  fieldId: z.string().min(1),
  materiality: vsmeMaterialityEnum,
});

export const updateMaterialitySchema = z.object({
  items: z.array(materialityItemSchema).min(1),
});
