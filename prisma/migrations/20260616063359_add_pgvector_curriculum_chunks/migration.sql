-- CreateTable
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE curriculum_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_file text NOT NULL,
  page_number int,
  chunk_index int NOT NULL,
  content text NOT NULL,
  embedding vector(1536),
  created_at timestamp DEFAULT now()
);

CREATE INDEX ON curriculum_chunks USING ivfflat (embedding vector_cosine_ops);