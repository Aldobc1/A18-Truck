-- =============================================
-- CORRECCIÓN DE TABLAS DE FACTURACIÓN
-- =============================================

-- Primero verificar si las tablas existen y agregar columnas faltantes
DO $$
BEGIN
    -- Verificar y crear tabla subscriptions_a18 si no existe
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'subscriptions_a18') THEN
        CREATE TABLE subscriptions_a18 (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            workspace_id UUID NOT NULL,
            user_id UUID NOT NULL,
            plan_id TEXT NOT NULL CHECK (plan_id IN ('basic','business','professional')),
            status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active','cancelled','past_due','pending','incomplete')),
            current_period_start TIMESTAMP WITH TIME ZONE,
            current_period_end TIMESTAMP WITH TIME ZONE,
            cancelled_at TIMESTAMP WITH TIME ZONE,
            stripe_subscription_id TEXT UNIQUE,
            stripe_customer_id TEXT,
            trial_end TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    ELSE
        -- Agregar columnas faltantes si la tabla ya existe
        BEGIN
            ALTER TABLE subscriptions_a18 ADD COLUMN IF NOT EXISTS workspace_id UUID;
        EXCEPTION WHEN duplicate_column THEN
            -- La columna ya existe, continuar
        END;
        
        BEGIN
            ALTER TABLE subscriptions_a18 ADD COLUMN IF NOT EXISTS user_id UUID;
        EXCEPTION WHEN duplicate_column THEN
            -- La columna ya existe, continuar
        END;
    END IF;

    -- Verificar y crear tabla invoices_a18 si no existe
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'invoices_a18') THEN
        CREATE TABLE invoices_a18 (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            subscription_id UUID,
            workspace_id UUID NOT NULL,
            amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
            currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD','EUR','MXN')),
            status TEXT NOT NULL CHECK (status IN ('paid','pending','failed','cancelled')),
            description TEXT,
            invoice_number TEXT UNIQUE,
            invoice_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            due_date TIMESTAMP WITH TIME ZONE,
            paid_date TIMESTAMP WITH TIME ZONE,
            stripe_invoice_id TEXT UNIQUE,
            stripe_payment_intent_id TEXT,
            download_url TEXT,
            pdf_generated BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;

    -- Verificar y crear tabla payment_methods_a18 si no existe
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payment_methods_a18') THEN
        CREATE TABLE payment_methods_a18 (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            workspace_id UUID NOT NULL,
            stripe_payment_method_id TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT 'card' CHECK (type IN ('card','bank_account','paypal')),
            brand TEXT,
            last4 TEXT,
            exp_month INTEGER CHECK (exp_month >= 1 AND exp_month <= 12),
            exp_year INTEGER CHECK (exp_year >= 2024),
            is_default BOOLEAN DEFAULT FALSE,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;

    -- Verificar y crear tabla stripe_webhooks_a18 para manejar eventos de Stripe
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'stripe_webhooks_a18') THEN
        CREATE TABLE stripe_webhooks_a18 (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            stripe_event_id TEXT UNIQUE NOT NULL,
            event_type TEXT NOT NULL,
            processed BOOLEAN DEFAULT FALSE,
            data JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            processed_at TIMESTAMP WITH TIME ZONE
        );
    END IF;
END $$;

-- Habilitar Row Level Security
ALTER TABLE subscriptions_a18 ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices_a18 ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods_a18 ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_webhooks_a18 ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Users can view subscriptions for their workspaces" ON subscriptions_a18;
DROP POLICY IF EXISTS "Admins can manage subscriptions for their workspaces" ON subscriptions_a18;
DROP POLICY IF EXISTS "Users can view invoices for their workspaces" ON invoices_a18;
DROP POLICY IF EXISTS "System can insert invoices" ON invoices_a18;
DROP POLICY IF EXISTS "Users can view payment methods for their workspaces" ON payment_methods_a18;
DROP POLICY IF EXISTS "Admins can manage payment methods for their workspaces" ON payment_methods_a18;

-- Crear políticas RLS actualizadas
CREATE POLICY "Users can view subscriptions for their workspaces" 
ON subscriptions_a18 FOR SELECT 
USING (
    workspace_id IN (
        SELECT workspace_id 
        FROM user_workspaces_a18 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Admins can manage subscriptions for their workspaces" 
ON subscriptions_a18 FOR ALL 
USING (
    workspace_id IN (
        SELECT uw.workspace_id 
        FROM user_workspaces_a18 uw 
        JOIN users_a18 u ON uw.user_id = u.id 
        WHERE u.id = auth.uid() 
        AND u.role IN ('admin', 'superadmin')
    )
);

-- Política para permitir inserción desde webhooks (servicio)
CREATE POLICY "Service can insert subscriptions" 
ON subscriptions_a18 FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Service can update subscriptions" 
ON subscriptions_a18 FOR UPDATE 
USING (true);

-- Políticas para invoices
CREATE POLICY "Users can view invoices for their workspaces" 
ON invoices_a18 FOR SELECT 
USING (
    workspace_id IN (
        SELECT workspace_id 
        FROM user_workspaces_a18 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "System can manage invoices" 
ON invoices_a18 FOR ALL 
WITH CHECK (true);

-- Políticas para payment methods
CREATE POLICY "Users can view payment methods for their workspaces" 
ON payment_methods_a18 FOR SELECT 
USING (
    workspace_id IN (
        SELECT workspace_id 
        FROM user_workspaces_a18 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Admins can manage payment methods for their workspaces" 
ON payment_methods_a18 FOR ALL 
USING (
    workspace_id IN (
        SELECT uw.workspace_id 
        FROM user_workspaces_a18 uw 
        JOIN users_a18 u ON uw.user_id = u.id 
        WHERE u.id = auth.uid() 
        AND u.role IN ('admin', 'superadmin')
    )
);

-- Política para webhooks (solo superadmin puede ver)
CREATE POLICY "Superadmin can view webhooks" 
ON stripe_webhooks_a18 FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM users_a18 
        WHERE id = auth.uid() 
        AND role = 'superadmin'
    )
);

CREATE POLICY "Service can manage webhooks" 
ON stripe_webhooks_a18 FOR ALL 
WITH CHECK (true);

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_subscriptions_workspace_id ON subscriptions_a18(workspace_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions_a18(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions_a18(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON subscriptions_a18(stripe_subscription_id);

CREATE INDEX IF NOT EXISTS idx_invoices_subscription_id ON invoices_a18(subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_workspace_id ON invoices_a18(workspace_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices_a18(status);

CREATE INDEX IF NOT EXISTS idx_payment_methods_workspace_id ON payment_methods_a18(workspace_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods_a18(user_id);

CREATE INDEX IF NOT EXISTS idx_webhooks_event_id ON stripe_webhooks_a18(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_processed ON stripe_webhooks_a18(processed);

-- Función para manejar webhooks de Stripe
CREATE OR REPLACE FUNCTION handle_stripe_webhook(
    event_id TEXT,
    event_type TEXT,
    event_data JSONB
) RETURNS BOOLEAN AS $$
DECLARE
    subscription_data JSONB;
    customer_id TEXT;
    workspace_uuid UUID;
    user_uuid UUID;
    plan_id TEXT;
    status TEXT;
BEGIN
    -- Registrar el evento de webhook
    INSERT INTO stripe_webhooks_a18 (stripe_event_id, event_type, data)
    VALUES (event_id, event_type, event_data)
    ON CONFLICT (stripe_event_id) DO NOTHING;
    
    -- Procesar según el tipo de evento
    CASE event_type
        WHEN 'checkout.session.completed' THEN
            -- Extraer datos de la sesión de checkout
            subscription_data := event_data->'data'->'object';
            customer_id := subscription_data->>'customer';
            
            -- Buscar el workspace y usuario basado en metadata o customer_id
            -- (Esto requiere que guardes metadata en la sesión de Stripe)
            SELECT 
                (subscription_data->'metadata'->>'workspace_id')::UUID,
                (subscription_data->'metadata'->>'user_id')::UUID,
                subscription_data->'metadata'->>'plan_id'
            INTO workspace_uuid, user_uuid, plan_id;
            
            -- Crear o actualizar suscripción
            INSERT INTO subscriptions_a18 (
                workspace_id,
                user_id,
                plan_id,
                status,
                stripe_customer_id,
                stripe_subscription_id,
                current_period_start,
                current_period_end
            ) VALUES (
                workspace_uuid,
                user_uuid,
                plan_id,
                'active',
                customer_id,
                subscription_data->>'subscription',
                NOW(),
                NOW() + INTERVAL '1 month'
            )
            ON CONFLICT (workspace_id) 
            DO UPDATE SET
                status = 'active',
                stripe_customer_id = customer_id,
                stripe_subscription_id = subscription_data->>'subscription',
                updated_at = NOW();

        WHEN 'invoice.payment_succeeded' THEN
            -- Marcar factura como pagada
            UPDATE invoices_a18 
            SET 
                status = 'paid',
                paid_date = NOW(),
                stripe_payment_intent_id = event_data->'data'->'object'->>'payment_intent'
            WHERE stripe_invoice_id = event_data->'data'->'object'->>'id';

        WHEN 'invoice.payment_failed' THEN
            -- Marcar factura como fallida
            UPDATE invoices_a18 
            SET status = 'failed'
            WHERE stripe_invoice_id = event_data->'data'->'object'->>'id';
            
            -- Marcar suscripción como past_due
            UPDATE subscriptions_a18 
            SET status = 'past_due'
            WHERE stripe_subscription_id = event_data->'data'->'object'->>'subscription';

        WHEN 'customer.subscription.updated' THEN
            -- Actualizar suscripción
            subscription_data := event_data->'data'->'object';
            
            UPDATE subscriptions_a18 
            SET 
                status = CASE 
                    WHEN subscription_data->>'status' = 'active' THEN 'active'
                    WHEN subscription_data->>'status' = 'canceled' THEN 'cancelled'
                    WHEN subscription_data->>'status' = 'past_due' THEN 'past_due'
                    ELSE 'pending'
                END,
                current_period_start = to_timestamp((subscription_data->>'current_period_start')::bigint),
                current_period_end = to_timestamp((subscription_data->>'current_period_end')::bigint),
                updated_at = NOW()
            WHERE stripe_subscription_id = subscription_data->>'id';

        WHEN 'customer.subscription.deleted' THEN
            -- Cancelar suscripción
            UPDATE subscriptions_a18 
            SET 
                status = 'cancelled',
                cancelled_at = NOW(),
                updated_at = NOW()
            WHERE stripe_subscription_id = event_data->'data'->'object'->>'id';

        ELSE
            -- Evento no manejado
            RAISE NOTICE 'Unhandled webhook event type: %', event_type;
    END CASE;
    
    -- Marcar webhook como procesado
    UPDATE stripe_webhooks_a18 
    SET 
        processed = TRUE,
        processed_at = NOW()
    WHERE stripe_event_id = event_id;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        -- Log del error
        RAISE NOTICE 'Error processing webhook %: %', event_id, SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para activar suscripción manualmente (para testing)
CREATE OR REPLACE FUNCTION activate_subscription_manual(
    p_workspace_id UUID,
    p_user_id UUID,
    p_plan_id TEXT
) RETURNS UUID AS $$
DECLARE
    subscription_id UUID;
BEGIN
    INSERT INTO subscriptions_a18 (
        workspace_id,
        user_id,
        plan_id,
        status,
        current_period_start,
        current_period_end,
        stripe_subscription_id,
        stripe_customer_id
    ) VALUES (
        p_workspace_id,
        p_user_id,
        p_plan_id,
        'active',
        NOW(),
        NOW() + INTERVAL '1 month',
        'sub_manual_' || gen_random_uuid(),
        'cus_manual_' || gen_random_uuid()
    )
    ON CONFLICT (workspace_id) 
    DO UPDATE SET
        plan_id = p_plan_id,
        status = 'active',
        current_period_start = NOW(),
        current_period_end = NOW() + INTERVAL '1 month',
        updated_at = NOW()
    RETURNING id INTO subscription_id;
    
    RETURN subscription_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear algunas suscripciones de ejemplo para testing
DO $$
DECLARE
    workspace_rec RECORD;
BEGIN
    FOR workspace_rec IN 
        SELECT w.id, w.creator_id 
        FROM workspaces_a18 w 
        WHERE NOT EXISTS (
            SELECT 1 FROM subscriptions_a18 s 
            WHERE s.workspace_id = w.id
        )
        LIMIT 3
    LOOP
        PERFORM activate_subscription_manual(
            workspace_rec.id,
            workspace_rec.creator_id,
            'business'
        );
    END LOOP;
END $$;

-- Comentarios de documentación
COMMENT ON TABLE subscriptions_a18 IS 'Almacena las suscripciones activas de los workspaces';
COMMENT ON TABLE invoices_a18 IS 'Almacena las facturas generadas por Stripe';
COMMENT ON TABLE payment_methods_a18 IS 'Almacena los métodos de pago de los usuarios';
COMMENT ON TABLE stripe_webhooks_a18 IS 'Log de eventos de webhooks de Stripe para auditoría';
COMMENT ON FUNCTION handle_stripe_webhook IS 'Procesa eventos de webhooks de Stripe automáticamente';