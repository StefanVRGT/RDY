-- Add exercise grouping and bilingual video URL support
ALTER TABLE "exercises" ADD COLUMN "group_name" varchar(100);
ALTER TABLE "exercises" ADD COLUMN "video_url_de" text;
ALTER TABLE "exercises" ADD COLUMN "video_url_en" text;
