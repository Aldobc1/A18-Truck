# 🔗 Configuración de Webhooks de Stripe

## ✅ Problemas Solucionados

### 1. Error de Base de Datos
- **Problema**: `column subscriptions_a18.workspace_id does not exist`
- **Solución**: Migración SQL que crea/actualiza las tablas de facturación con todas las columnas necesarias

### 2. Automatización de Suscripciones
- **Problema**: Las suscripciones no se activan automáticamente después del pago
- **Solución**: Sistema completo de webhooks con funciones de Supabase

## 🚀 Características Implementadas

### 📊 Tablas de Base de Datos Actualizadas
- `subscriptions_a18` - Suscripciones con workspace_id
- `invoices_a18` - Facturas generadas por Stripe
- `payment_methods_a18` - Métodos de pago de usuarios
- `stripe_webhooks_a18` - Log de eventos de webhooks

### 🔧 Funciones de Supabase
- `handle_stripe_webhook()` - Procesa eventos de Stripe automáticamente
- `activate_subscription_manual()` - Activación manual para testing

### 📱 Componentes Nuevos
- `WebhookTester` - Herramienta para probar webhooks (solo SuperAdmin)
- API de webhooks en `/src/api/webhooks.js`

## 🔗 Configuración de Webhooks en Stripe

### 1. Crear Endpoint en Stripe Dashboard

```
URL del Webhook: https://tu-dominio.com/api/webhooks/stripe
Eventos a Escuchar:
- checkout.session.completed
- invoice.payment_succeeded  
- invoice.payment_failed
- customer.subscription.updated
- customer.subscription.deleted
```

### 2. Eventos Manejados

| Evento | Descripción | Acción |
|--------|-------------|---------|
| `checkout.session.completed` | Pago completado | Activa suscripción |
| `invoice.payment_succeeded` | Factura pagada | Marca como pagada |
| `invoice.payment_failed` | Pago falló | Marca suscripción como `past_due` |
| `customer.subscription.updated` | Suscripción actualizada | Sincroniza estado |
| `customer.subscription.deleted` | Suscripción cancelada | Marca como cancelada |

### 3. Configuración del Servidor (Backend)

```javascript
// Ejemplo de endpoint de webhook (Node.js/Express)
app.post('/api/webhooks/stripe', express.raw({type: 'application/json'}), (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.log(`Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Procesar el evento usando la función de Supabase
  handleStripeWebhook(event);
  
  res.json({received: true});
});
```

## 🧪 Testing de Webhooks

### Usar el WebhookTester (Solo SuperAdmin)
1. Ve a `/admin/webhooks` en el panel de administración
2. Selecciona el tipo de evento a simular
3. Haz clic en "Simular Webhook" o "Activar Manualmente"

### Función Manual de Testing
```sql
-- Activar suscripción manualmente
SELECT activate_subscription_manual(
  'workspace-uuid'::UUID,
  'user-uuid'::UUID, 
  'business'
);
```

## 🔐 Seguridad

### Row Level Security (RLS)
- Todas las tablas tienen RLS habilitado
- Políticas específicas por rol (admin, superadmin, usuario)
- Webhooks solo visibles para superadmin

### Validación de Webhooks
- Verificación de firma de Stripe
- Prevención de eventos duplicados
- Log completo de todos los eventos

## 📋 Pasos para Producción

1. **Ejecutar Migración**:
   ```bash
   # En Supabase SQL Editor, ejecutar:
   # supabase/migrations/002_fix_billing_tables.sql
   ```

2. **Configurar Webhooks en Stripe**:
   - Dashboard de Stripe → Webhooks → Add endpoint
   - URL: `https://tu-dominio.com/api/webhooks/stripe`
   - Eventos: Los listados arriba

3. **Variables de Entorno**:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_PUBLISHABLE_KEY=pk_live_...
   STRIPE_SECRET_KEY=sk_live_...
   ```

4. **Testing**:
   - Usar WebhookTester para probar localmente
   - Usar Stripe CLI para testing: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

## ✅ Verificación

Después de la configuración:

1. ✅ Las tablas de facturación existen con todas las columnas
2. ✅ Los webhooks se procesan automáticamente  
3. ✅ Las suscripciones se activan tras el pago
4. ✅ Los eventos se registran en `stripe_webhooks_a18`
5. ✅ El WebhookTester funciona para SuperAdmin

¡Tu sistema de facturación ahora está completamente automatizado! 🎉