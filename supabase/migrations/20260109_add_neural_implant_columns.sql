-- Add neural_target_id and neural_holder_id columns to amulets table
-- Required for Neural Implant amulet functionality

ALTER TABLE amulets
ADD COLUMN IF NOT EXISTS neural_target_id UUID REFERENCES game_players(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS neural_holder_id UUID REFERENCES game_players(id) ON DELETE SET NULL;

-- Add index for neural_target_id lookups
CREATE INDEX IF NOT EXISTS idx_amulets_neural_target ON amulets(neural_target_id);
CREATE INDEX IF NOT EXISTS idx_amulets_neural_holder ON amulets(neural_holder_id);
