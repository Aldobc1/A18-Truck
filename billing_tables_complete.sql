-- ================================
-- SISTEMA DE FACTURACIÓN COMPLETO
-- ================================

-- Crear tabla de suscripciones
CREATE TABLE IF NOT EXISTS subscriptions_a18 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces_a18(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users_a18(id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL CHECK (plan_id IN ('basic', 'business', 'professional')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'pending', 'incomplete')),
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    stripe_subscription_id TEXT UNIQUE,
    stripe_customer_id TEXT,
    trial_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_workspace_subscription UNIQUE(workspace_id)
);

-- Crear tabla de facturas
CREATE TABLE IF NOT EXISTS invoices_a18 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID REFERENCES subscriptions_a18(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces_a18(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'EUR', 'MXN')),
    status TEXT NOT NULL CHECK (status IN ('paid', 'pending', 'failed', 'cancelled')),
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

-- Crear tabla de métodos de pago
CREATE TABLE IF NOT EXISTS payment_methods_a18 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users_a18(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces_a18(id) ON DELETE CASCADE,
    stripe_payment_method_id TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'card' CHECK (type IN ('card', 'bank_account', 'paypal')),
    brand TEXT,
    last4 TEXT,
    exp_month INTEGER CHECK (exp_month >= 1 AND exp_month <= 12),
    exp_year INTEGER CHECK (exp_year >= 2024),
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de transacciones para auditoría
CREATE TABLE IF NOT EXISTS billing_transactions_a18 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID REFERENCES subscriptions_a18(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES invoices_a18(id) ON DELETE SET NULL,
    workspace_id UUID REFERENCES workspaces_a18(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('payment', 'refund', 'chargeback', 'adjustment')),
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    status TEXT NOT NULL CHECK (status IN ('succeeded', 'failed', 'pending', 'cancelled')),
    stripe_transaction_id TEXT,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE subscriptions_a18 ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices_a18 ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods_a18 ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_transactions_a18 ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para subscriptions_a18
CREATE POLICY "Users can view subscriptions for their workspaces" ON subscriptions_a18
    FOR SELECT USING (
        workspace_id IN (
            SELECT workspace_id FROM user_workspaces_a18 WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage subscriptions for their workspaces" ON subscriptions_a18
    FOR ALL USING (
        workspace_id IN (
            SELECT uw.workspace_id FROM user_workspaces_a18 uw
            JOIN users_a18 u ON uw.user_id = u.id
            WHERE u.id = auth.uid() AND u.role IN ('admin', 'superadmin')
        )
    );

-- Políticas RLS para invoices_a18
CREATE POLICY "Users can view invoices for their workspaces" ON invoices_a18
    FOR SELECT USING (
        workspace_id IN (
            SELECT workspace_id FROM user_workspaces_a18 WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "System can insert invoices" ON invoices_a18
    FOR INSERT WITH CHECK (true);

-- Políticas RLS para payment_methods_a18
CREATE POLICY "Users can view payment methods for their workspaces" ON payment_methods_a18
    FOR SELECT USING (
        workspace_id IN (
            SELECT workspace_id FROM user_workspaces_a18 WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage payment methods for their workspaces" ON payment_methods_a18
    FOR ALL USING (
        workspace_id IN (
            SELECT uw.workspace_id FROM user_workspaces_a18 uw
            JOIN users_a18 u ON uw.user_id = u.id
            WHERE u.id = auth.uid() AND u.role IN ('admin', 'superadmin')
        )
    );

-- Políticas RLS para billing_transactions_a18
CREATE POLICY "Users can view transactions for their workspaces" ON billing_transactions_a18
    FOR SELECT USING (
        workspace_id IN (
            SELECT workspace_id FROM user_workspaces_a18 WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "System can insert transactions" ON billing_transactions_a18
    FOR INSERT WITH CHECK (true);

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_subscriptions_workspace_id ON subscriptions_a18(workspace_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions_a18(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions_a18(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON subscriptions_a18(stripe_subscription_id);

CREATE INDEX IF NOT EXISTS idx_invoices_subscription_id ON invoices_a18(subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_workspace_id ON invoices_a18(workspace_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices_a18(status);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices_a18(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_id ON invoices_a18(stripe_invoice_id);

CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods_a18(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_workspace_id ON payment_methods_a18(workspace_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_default ON payment_methods_a18(workspace_id, is_default) WHERE is_default = TRUE;

CREATE INDEX IF NOT EXISTS idx_billing_transactions_workspace_id ON billing_transactions_a18(workspace_id);
CREATE INDEX IF NOT EXISTS idx_billing_transactions_type ON billing_transactions_a18(transaction_type);
CREATE INDEX IF NOT EXISTS idx_billing_transactions_date ON billing_transactions_a18(created_at);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions_a18
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices_a18
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON payment_methods_a18
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Crear secuencia para números de factura
CREATE SEQUENCE IF NOT EXISTS invoice_sequence START 1;

-- Función para generar número de factura automático
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invoice_number IS NULL THEN
        NEW.invoice_number = 'INV-' || 
                           to_char(NEW.created_at, 'YYYY') || '-' || 
                           LPAD(EXTRACT(DOY FROM NEW.created_at)::text, 3, '0') || '-' || 
                           LPAD(nextval('invoice_sequence')::text, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para generar número de factura
CREATE TRIGGER generate_invoice_number_trigger BEFORE INSERT ON invoices_a18
    FOR EACH ROW EXECUTE FUNCTION generate_invoice_number();

-- Función para crear factura automáticamente cuando se actualiza una suscripción
CREATE OR REPLACE FUNCTION create_invoice_on_subscription_renewal()
RETURNS TRIGGER AS $$
DECLARE
    plan_amount DECIMAL(10,2);
    plan_name TEXT;
BEGIN
    -- Determinar el monto según el plan
    CASE NEW.plan_id
        WHEN 'basic' THEN 
            plan_amount := 499.00;
            plan_name := 'Plan Básico';
        WHEN 'business' THEN 
            plan_amount := 899.00;
            plan_name := 'Plan Empresarial';
        WHEN 'professional' THEN 
            plan_amount := 1499.00;
            plan_name := 'Plan Profesional';
        ELSE 
            plan_amount := 0.00;
            plan_name := 'Plan Desconocido';
    END CASE;

    -- Crear factura si la suscripción está activa y tiene un período actual
    IF NEW.status = 'active' AND NEW.current_period_start IS NOT NULL THEN
        INSERT INTO invoices_a18 (
            subscription_id,
            workspace_id,
            amount,
            currency,
            status,
            description,
            invoice_date,
            due_date
        ) VALUES (
            NEW.id,
            NEW.workspace_id,
            plan_amount,
            'USD',
            'pending',
            plan_name || ' - ' || to_char(NEW.current_period_start, 'Month YYYY'),
            NEW.current_period_start,
            NEW.current_period_end
        );
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para crear facturas automáticamente
CREATE TRIGGER create_invoice_on_renewal AFTER INSERT OR UPDATE ON subscriptions_a18
    FOR EACH ROW EXECUTE FUNCTION create_invoice_on_subscription_renewal();

-- Insertar datos de ejemplo (solo si no existen)
INSERT INTO subscriptions_a18 (
    workspace_id,
    user_id,
    plan_id,
    status,
    current_period_start,
    current_period_end,
    stripe_subscription_id,
    stripe_customer_id
)
SELECT 
    w.id,
    w.creator_id,
    'business',
    'active',
    NOW() - INTERVAL '30 days',
    NOW() + INTERVAL '30 days',
    'sub_demo_' || w.id,
    'cus_demo_' || w.creator_id
FROM workspaces_a18 w
WHERE NOT EXISTS (
    SELECT 1 FROM subscriptions_a18 s WHERE s.workspace_id = w.id
)
LIMIT 3;

-- Insertar métodos de pago de ejemplo
INSERT INTO payment_methods_a18 (
    user_id,
    workspace_id,
    stripe_payment_method_id,
    type,
    brand,
    last4,
    exp_month,
    exp_year,
    is_default
)
SELECT 
    s.user_id,
    s.workspace_id,
    'pm_demo_' || s.user_id,
    'card',
    'visa',
    '4242',
    12,
    2025,
    true
FROM subscriptions_a18 s
WHERE NOT EXISTS (
    SELECT 1 FROM payment_methods_a18 pm WHERE pm.workspace_id = s.workspace_id
)
LIMIT 3;

-- Comentarios para documentación
COMMENT ON TABLE subscriptions_a18 IS 'Almacena las suscripciones de los workspaces a los diferentes planes';
COMMENT ON TABLE invoices_a18 IS 'Almacena las facturas generadas para las suscripciones';
COMMENT ON TABLE payment_methods_a18 IS 'Almacena los métodos de pago de los usuarios/workspaces';
COMMENT ON TABLE billing_transactions_a18 IS 'Almacena el historial de transacciones para auditoría';