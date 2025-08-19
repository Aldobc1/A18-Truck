-- ============================================
-- CREAR FUNCIÓN PARA MANEJAR WEBHOOKS DE STRIPE
-- ============================================

-- Primero, crear la tabla de webhooks si no existe
CREATE TABLE IF NOT EXISTS stripe_webhooks_a18 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_event_id TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Habilitar RLS
ALTER TABLE stripe_webhooks_a18 ENABLE ROW LEVEL SECURITY;

-- Política para webhooks (solo servicio puede escribir, superadmin puede leer)
DROP POLICY IF EXISTS "Service can manage webhooks" ON stripe_webhooks_a18;
DROP POLICY IF EXISTS "Superadmin can view webhooks" ON stripe_webhooks_a18;

CREATE POLICY "Service can manage webhooks" ON stripe_webhooks_a18 
FOR ALL WITH CHECK (true);

CREATE POLICY "Superadmin can view webhooks" ON stripe_webhooks_a18 
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM users_a18 
        WHERE id = auth.uid() AND role = 'superadmin'
    )
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_webhooks_event_id ON stripe_webhooks_a18(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_processed ON stripe_webhooks_a18(processed);

-- ============================================
-- FUNCIÓN PRINCIPAL PARA MANEJAR WEBHOOKS
-- ============================================

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
    existing_webhook_id UUID;
BEGIN
    -- Verificar si el webhook ya fue procesado
    SELECT id INTO existing_webhook_id 
    FROM stripe_webhooks_a18 
    WHERE stripe_event_id = event_id AND processed = TRUE;
    
    IF existing_webhook_id IS NOT NULL THEN
        RAISE NOTICE 'Webhook % already processed', event_id;
        RETURN TRUE;
    END IF;

    -- Registrar el evento de webhook (prevenir duplicados)
    INSERT INTO stripe_webhooks_a18 (stripe_event_id, event_type, data)
    VALUES (event_id, event_type, event_data)
    ON CONFLICT (stripe_event_id) DO NOTHING;

    -- Log del evento
    RAISE NOTICE 'Processing webhook event: % of type: %', event_id, event_type;

    -- Procesar según el tipo de evento
    CASE event_type
        WHEN 'checkout.session.completed' THEN
            -- Extraer datos de la sesión de checkout
            subscription_data := event_data->'data'->'object';
            customer_id := subscription_data->>'customer';
            
            -- Extraer metadata (debe estar configurada en Stripe)
            workspace_uuid := (subscription_data->'metadata'->>'workspace_id')::UUID;
            user_uuid := (subscription_data->'metadata'->>'user_id')::UUID;
            plan_id := subscription_data->'metadata'->>'plan_id';
            
            -- Si no hay metadata, usar valores por defecto para testing
            IF workspace_uuid IS NULL THEN
                -- Buscar el primer workspace disponible para testing
                SELECT w.id, w.creator_id INTO workspace_uuid, user_uuid
                FROM workspaces_a18 w
                LIMIT 1;
                plan_id := 'business'; -- Plan por defecto
            END IF;
            
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
            ON CONFLICT (workspace_id) DO UPDATE SET
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
            
            -- Si no se encontró la factura, crear una nueva
            IF NOT FOUND THEN
                INSERT INTO invoices_a18 (
                    workspace_id,
                    amount,
                    currency,
                    status,
                    description,
                    stripe_invoice_id,
                    stripe_payment_intent_id
                ) VALUES (
                    (SELECT workspace_id FROM subscriptions_a18 
                     WHERE stripe_subscription_id = event_data->'data'->'object'->>'subscription' 
                     LIMIT 1),
                    (event_data->'data'->'object'->>'amount_paid')::DECIMAL / 100,
                    UPPER(event_data->'data'->'object'->>'currency'),
                    'paid',
                    'Stripe Invoice Payment',
                    event_data->'data'->'object'->>'id',
                    event_data->'data'->'object'->>'payment_intent'
                );
            END IF;

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

    RAISE NOTICE 'Successfully processed webhook: %', event_id;
    RETURN TRUE;

EXCEPTION WHEN OTHERS THEN
    -- Log del error
    RAISE NOTICE 'Error processing webhook %: %', event_id, SQLERRM;
    
    -- Marcar webhook como fallido pero no procesado
    UPDATE stripe_webhooks_a18 
    SET processed_at = NOW()
    WHERE stripe_event_id = event_id;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCIÓN PARA ACTIVAR SUSCRIPCIÓN MANUALMENTE
-- ============================================

CREATE OR REPLACE FUNCTION activate_subscription_manual(
    p_workspace_id UUID,
    p_user_id UUID,
    p_plan_id TEXT
) RETURNS UUID AS $$
DECLARE
    subscription_id UUID;
BEGIN
    -- Insertar o actualizar suscripción
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
    ON CONFLICT (workspace_id) DO UPDATE SET
        plan_id = p_plan_id,
        status = 'active',
        current_period_start = NOW(),
        current_period_end = NOW() + INTERVAL '1 month',
        updated_at = NOW()
    RETURNING id INTO subscription_id;

    -- Crear una factura de ejemplo
    INSERT INTO invoices_a18 (
        subscription_id,
        workspace_id,
        amount,
        currency,
        status,
        description
    ) VALUES (
        subscription_id,
        p_workspace_id,
        CASE p_plan_id
            WHEN 'basic' THEN 4.99
            WHEN 'business' THEN 8.99
            WHEN 'professional' THEN 14.99
            ELSE 0.00
        END,
        'USD',
        'paid',
        'Manual Activation - ' || 
        CASE p_plan_id
            WHEN 'basic' THEN 'Plan Básico'
            WHEN 'business' THEN 'Plan Empresarial'
            WHEN 'professional' THEN 'Plan Profesional'
            ELSE 'Plan Desconocido'
        END
    );

    RETURN subscription_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCIÓN PARA LIMPIAR WEBHOOKS ANTIGUOS
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_old_webhooks() RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Eliminar webhooks procesados más antiguos de 30 días
    DELETE FROM stripe_webhooks_a18 
    WHERE processed = TRUE 
    AND created_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentarios de documentación
COMMENT ON FUNCTION handle_stripe_webhook IS 'Procesa eventos de webhooks de Stripe automáticamente';
COMMENT ON FUNCTION activate_subscription_manual IS 'Activa una suscripción manualmente para testing';
COMMENT ON FUNCTION cleanup_old_webhooks IS 'Limpia webhooks antiguos procesados (ejecutar periódicamente)';

-- Crear algunas suscripciones de ejemplo si no existen
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