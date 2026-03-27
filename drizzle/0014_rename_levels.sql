ALTER TABLE schwerpunktebenen RENAME COLUMN month_number TO level_number;
ALTER TABLE class_curriculum RENAME COLUMN month_number TO level_number;
ALTER TABLE classes RENAME COLUMN duration_months TO duration_levels;
ALTER TABLE classes ALTER COLUMN duration_levels SET DEFAULT 5;
