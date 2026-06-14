/**
 * SystemConfigRepository — key-value configuration store.
 */

import type { PrismaClient, SystemConfig } from "@prisma/client";

export class SystemConfigRepository {
  constructor(private readonly db: PrismaClient) {}

  async findAll(): Promise<SystemConfig[]> {
    return this.db.systemConfig.findMany({ orderBy: { key: "asc" } });
  }

  async findByKey(key: string): Promise<SystemConfig | null> {
    return this.db.systemConfig.findUnique({ where: { key } });
  }

  async getValue(key: string): Promise<string | null> {
    const record = await this.findByKey(key);
    return record?.value ?? null;
  }

  async upsert(
    key: string,
    value: string,
    updatedBy: string,
    description?: string
  ): Promise<SystemConfig> {
    return this.db.systemConfig.upsert({
      where: { key },
      create: { key, value, description, updatedBy },
      update: { value, updatedBy, ...(description ? { description } : {}) },
    });
  }

  async upsertMany(
    entries: { key: string; value: string; updatedBy: string }[]
  ): Promise<void> {
    await this.db.$transaction(
      entries.map(({ key, value, updatedBy }) =>
        this.db.systemConfig.upsert({
          where: { key },
          create: { key, value, updatedBy },
          update: { value, updatedBy },
        })
      )
    );
  }
}
