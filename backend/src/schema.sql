-- ============================================================
-- SCHEMA v2: Consórcio App com RBAC
-- ============================================================

-- USUÁRIOS
CREATE TABLE IF NOT EXISTS usuarios (
  id          SERIAL PRIMARY KEY,
  nome        VARCHAR(150) NOT NULL,
  email       VARCHAR(150) NOT NULL UNIQUE,
  senha_hash  VARCHAR(255) NOT NULL,
  role        VARCHAR(20)  NOT NULL DEFAULT 'consorciado' CHECK (role IN ('admin','gerente','consorciado')),
  ativo       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- GRUPOS DE CONSÓRCIO (com gerente_id e invite_token)
CREATE TABLE IF NOT EXISTS grupos (
  id                   SERIAL PRIMARY KEY,
  nome                 VARCHAR(150) NOT NULL,
  descricao            TEXT,
  total_participantes  INTEGER NOT NULL DEFAULT 10,
  valor_premio         NUMERIC(12,2) NOT NULL,
  valor_cota_inicial   NUMERIC(12,2) NOT NULL,
  incremento_mensal    NUMERIC(10,2) NOT NULL DEFAULT 5.00,
  dia_pagamento        INTEGER NOT NULL DEFAULT 15,
  multa_atraso         NUMERIC(10,2) NOT NULL DEFAULT 10.00,
  mes_inicio           DATE NOT NULL,
  status               VARCHAR(20) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','encerrado','aguardando')),
  gerente_id           INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  invite_token         VARCHAR(64) UNIQUE,
  created_at           TIMESTAMP DEFAULT NOW()
);

-- PARTICIPANTES (com usuario_id)
CREATE TABLE IF NOT EXISTS participantes (
  id               SERIAL PRIMARY KEY,
  grupo_id         INTEGER NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
  usuario_id       INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  nome             VARCHAR(150) NOT NULL,
  email            VARCHAR(150),
  telefone         VARCHAR(30),
  ordem_sorteio    INTEGER,
  mes_contemplado  INTEGER,
  created_at       TIMESTAMP DEFAULT NOW()
);

-- PARCELAS
CREATE TABLE IF NOT EXISTS parcelas (
  id               SERIAL PRIMARY KEY,
  grupo_id         INTEGER NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
  participante_id  INTEGER NOT NULL REFERENCES participantes(id) ON DELETE CASCADE,
  numero_mes       INTEGER NOT NULL,
  mes_referencia   DATE NOT NULL,
  valor_cota       NUMERIC(12,2) NOT NULL,
  valor_multa      NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  data_vencimento  DATE NOT NULL,
  data_pagamento   DATE,
  status           VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','pago','atrasado')),
  observacao       TEXT,
  created_at       TIMESTAMP DEFAULT NOW()
);

-- LOG DE SORTEIOS
CREATE TABLE IF NOT EXISTS sorteio_log (
  id               SERIAL PRIMARY KEY,
  grupo_id         INTEGER NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
  participante_id  INTEGER NOT NULL REFERENCES participantes(id) ON DELETE CASCADE,
  mes_sorteado     INTEGER NOT NULL,
  data_sorteio     TIMESTAMP DEFAULT NOW()
);

-- ÍNDICES
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_participantes_grupo ON participantes(grupo_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_grupo ON parcelas(grupo_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_participante ON parcelas(participante_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_status ON parcelas(status);
CREATE INDEX IF NOT EXISTS idx_parcelas_vencimento ON parcelas(data_vencimento);

-- ============================================================
-- MIGRAÇÕES: adicionar colunas novas em tabelas já existentes
-- (seguro de rodar múltiplas vezes — IF NOT EXISTS)
-- ============================================================

-- grupos: gerente_id
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='grupos' AND column_name='gerente_id'
  ) THEN
    ALTER TABLE grupos ADD COLUMN gerente_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;
  END IF;
END $$;

-- grupos: invite_token
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='grupos' AND column_name='invite_token'
  ) THEN
    ALTER TABLE grupos ADD COLUMN invite_token VARCHAR(64) UNIQUE;
  END IF;
END $$;

-- participantes: usuario_id
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='participantes' AND column_name='usuario_id'
  ) THEN
    ALTER TABLE participantes ADD COLUMN usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Índices nas novas colunas (só após garantir que existem)
CREATE INDEX IF NOT EXISTS idx_participantes_usuario ON participantes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_grupos_invite ON grupos(invite_token);
CREATE INDEX IF NOT EXISTS idx_grupos_gerente ON grupos(gerente_id);

-- usuarios: telefone
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='usuarios' AND column_name='telefone'
  ) THEN
    ALTER TABLE usuarios ADD COLUMN telefone VARCHAR(30);
  END IF;
END $$;

-- usuarios: chave_pix
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='usuarios' AND column_name='chave_pix'
  ) THEN
    ALTER TABLE usuarios ADD COLUMN chave_pix VARCHAR(150);
  END IF;
END $$;
