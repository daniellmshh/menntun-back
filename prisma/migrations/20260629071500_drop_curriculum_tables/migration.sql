-- ADR-019: Drop curriculum_catalog and curriculum_chunks tables
-- The NEM knowledge base is now served from nem-unified-knowledge.json
-- loaded in-memory by NemKnowledgeService. No SQL queries needed for
-- curriculum data during planning generation.

-- Drop curriculum_catalog (was: Programa Sintético Fase 2, 102 rows)
DROP TABLE IF EXISTS "curriculum_catalog";

-- Drop curriculum_chunks (was: pgvector embeddings from preescolar-1.pdf, 213 rows)
-- Note: This table used the pgvector extension (vector type). Dropping it
-- also removes the associated ivfflat index automatically.
DROP TABLE IF EXISTS "curriculum_chunks";
