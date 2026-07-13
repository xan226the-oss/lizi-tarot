CREATE TABLE IF NOT EXISTS daily_draws (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  draw_date DATE NOT NULL,
  shown_card_ids INT[] NOT NULL,
  selected_card_id INT REFERENCES cards(id),
  orientation TEXT,
  UNIQUE(user_id, draw_date)
);
