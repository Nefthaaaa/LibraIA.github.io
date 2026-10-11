-- ==============================================================================
-- LibraIA - Esquema de Base de Datos para Supabase
-- ==============================================================================
-- Copia y pega este script en el "SQL Editor" de tu proyecto de Supabase
-- y presiona "RUN" para crear las tablas y políticas de seguridad necesarias.
-- ==============================================================================

-- 1. Tabla de Documentos
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    file_size INTEGER DEFAULT 0,
    page_count INTEGER DEFAULT 0,
    word_count INTEGER DEFAULT 0,
    extracted_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabla de Mensajes de Chat
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_messages_document_id ON public.messages(document_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON public.documents(created_at DESC);

-- 4. Habilitar Row Level Security (RLS)
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 5. Políticas públicas de acceso (para acceso anónimo o con Anon Key)
-- Permite leer documentos
CREATE POLICY "Permitir lectura publica de documentos" 
ON public.documents FOR SELECT 
USING (true);

-- Permite insertar documentos
CREATE POLICY "Permitir insercion publica de documentos" 
ON public.documents FOR INSERT 
WITH CHECK (true);

-- Permite eliminar documentos
CREATE POLICY "Permitir borrado publico de documentos" 
ON public.documents FOR DELETE 
USING (true);

-- Permite actualizar documentos
CREATE POLICY "Permitir actualizacion publica de documentos" 
ON public.documents FOR UPDATE 
USING (true);

-- Permite leer mensajes
CREATE POLICY "Permitir lectura publica de mensajes" 
ON public.messages FOR SELECT 
USING (true);

-- Permite insertar mensajes
CREATE POLICY "Permitir insercion publica de mensajes" 
ON public.messages FOR INSERT 
WITH CHECK (true);

-- Permite eliminar mensajes
CREATE POLICY "Permitir borrado publico de mensajes" 
ON public.messages FOR DELETE 
USING (true);

-- ==============================================================================
-- ¡Listo! Ahora copia tu URL del Proyecto y tu anon/public key desde:
-- Configuración del Proyecto -> API -> Project URL y Project API Keys (anon public)
-- y pégalas en los Ajustes dentro de la aplicación LibraIA.
-- ==============================================================================
