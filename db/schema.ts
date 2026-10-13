import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const settings = sqliteTable('archive_settings', { key: text('key').primaryKey(), value: text('value').notNull() });
export const images = sqliteTable('archive_images', {
  id: text('id').primaryKey(), title: text('title').notNull(), caption: text('caption').notNull().default(''),
  collection: text('collection').notNull(), chapter: text('chapter').notNull(), date: text('date').notNull(), position: integer('position').notNull(),
  originalKey: text('original_key').notNull(), displayKey: text('display_key').notNull(), thumbnailKey: text('thumbnail_key').notNull(),
  originalName: text('original_name').notNull(), width: integer('width').notNull(), height: integer('height').notNull(), bytes: integer('bytes').notNull(), createdAt: text('created_at').notNull()
});
