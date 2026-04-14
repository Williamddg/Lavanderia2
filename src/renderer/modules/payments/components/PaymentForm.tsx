import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import type { CatalogsPayload, PaymentInput } from '@shared/types';
import { Button, Input, Select } from '@renderer/ui/components';
import { currency } from '@renderer/utils/format';

export const PaymentForm = ({
  orderId,
  catalogs,
  balanceDue,
  onSubmit
}: {
  orderId: number;
  catalogs?: CatalogsPayload;
  balanceDue: number;
  onSubmit: (value: PaymentInput) => void;
}) => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<PaymentInput>({
    defaultValues: {
      orderId,
      paymentMethodId: catalogs?.paymentMethods?.[0]?.id ?? 1,
      amount: Number(balanceDue || 0),
      reference: null
    }
  });

  const receivedAmount = Number(watch('amount') || 0);
  const realPayment = Math.min(receivedAmount, Number(balanceDue || 0));
  const change = Math.max(0, receivedAmount - Number(balanceDue || 0));
  const pendingAfterPayment = Math.max(0, Number(balanceDue || 0) - receivedAmount);

  return (
    <form
      className="stack-gap"
      onSubmit={handleSubmit((values) => {
        const amount = Number(values.amount || 0);

        if (amount <= 0) {
          return;
        }

        onSubmit({
          orderId,
          paymentMethodId: Number(values.paymentMethodId),
          amount: Math.min(amount, Number(balanceDue || 0)),
          reference: values.reference || null
        });
      })}
    >
      <label>
        <span>Método de pago</span>
        <Select
          {...register('paymentMethodId', {
            valueAsNumber: true,
            required: 'Selecciona un método de pago'
          })}
        >
          {catalogs?.paymentMethods.map((method) => (
            <option key={method.id} value={method.id}>
              {method.name}
            </option>
          ))}
        </Select>
        {errors.paymentMethodId && (
          <small className="error-text">{errors.paymentMethodId.message}</small>
        )}
      </label>

      <label>
        <span>Valor recibido</span>
        <Input
          type="number"
          step="0.01"
          {...register('amount', {
            valueAsNumber: true,
            required: 'Ingresa un valor',
            min: {
              value: 0.01,
              message: 'El valor debe ser mayor a 0'
            }
          })}
        />
        {errors.amount && (
          <small className="error-text">{errors.amount.message}</small>
        )}
      </label>

      <label>
        <span>Referencia</span>
        <Input {...register('reference')} />
      </label>

      <div className="card-panel stack-gap" style={{ background: '#f8fafc' }}>
        <div className="detail-row">
          <span>Saldo pendiente</span>
          <strong>{currency(Number(balanceDue || 0))}</strong>
        </div>

        <div className="detail-row">
          <span>Se aplicará al pago</span>
          <strong>{currency(realPayment)}</strong>
        </div>

        <div className="detail-row">
          <span>Cambio a devolver</span>
          <strong>{currency(change)}</strong>
        </div>

        <div className="detail-row">
          <span>Saldo después del pago</span>
          <strong>{currency(pendingAfterPayment)}</strong>
        </div>
      </div>

      <div className="form-actions">
        <Button type="submit">Registrar pago</Button>
      </div>
    </form>
  );
};