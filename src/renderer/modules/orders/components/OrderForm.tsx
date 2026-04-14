import { useEffect, useMemo, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import type { CatalogsPayload, Client, OrderDetail, OrderInput } from '@shared/types';
import { Button, FormSection, Input, Select, Textarea } from '@renderer/ui/components';
import { currency } from '@renderer/utils/format';

const defaultValues: OrderInput = {
  clientId: 0,
  notes: null,
  dueDate: null,
  discountTotal: 0,
  paidAmount: 0,
  initialPaymentMethodId: null,
  initialPaymentReference: null,
  items: [
    {
      garmentTypeId: null,
      serviceId: null,
      description: '',
      quantity: 1,
      color: null,
      brand: null,
      sizeReference: null,
      material: null,
      receivedCondition: null,
      workDetail: null,
      stains: null,
      damages: null,
      missingAccessories: null,
      customerObservations: null,
      internalObservations: null,
      unitPrice: 0,
      discountAmount: 0,
      surchargeAmount: 0,
      subtotal: 0,
      total: 0
    }
  ]
};

export const OrderForm = ({
  clients,
  catalogs,
  onSubmit,
  initialValue,
  hideInitialPaymentFields = false,
  submitLabel = 'Guardar orden'
}: {
  clients: Client[];
  catalogs: CatalogsPayload | undefined;
  onSubmit: (value: OrderInput) => void;
  initialValue?: OrderDetail | null;
  hideInitialPaymentFields?: boolean;
  submitLabel?: string;
}) => {
  const {
    register,
    control,
    watch,
    setValue,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<OrderInput>({ defaultValues });

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: 'items'
  });

  const [serviceSearch, setServiceSearch] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!initialValue) {
      reset(defaultValues);
      setServiceSearch({});
      return;
    }

    const mapped: OrderInput = {
      clientId: initialValue.clientId,
      notes: initialValue.notes || null,
      dueDate: initialValue.dueDate ? initialValue.dueDate.slice(0, 10) : null,
      discountTotal: Number(initialValue.discountTotal || 0),
      paidAmount: 0,
      initialPaymentMethodId: null,
      initialPaymentReference: null,
      items: initialValue.items.map((item) => ({
        garmentTypeId: item.garmentTypeId,
        serviceId: item.serviceId,
        description: item.description,
        quantity: Number(item.quantity),
        color: null,
        brand: null,
        sizeReference: null,
        material: null,
        receivedCondition: null,
        workDetail: null,
        stains: null,
        damages: null,
        missingAccessories: null,
        customerObservations: item.customerObservations,
        internalObservations: null,
        unitPrice: Number(item.unitPrice),
        discountAmount: Number(item.discountAmount),
        surchargeAmount: Number(item.surchargeAmount),
        subtotal: Number(item.subtotal),
        total: Number(item.total)
      }))
    };

    reset(mapped);
    replace(mapped.items);

    const initialSearchState = mapped.items.reduce<Record<number, string>>((acc, item, index) => {
      acc[index] = item.serviceId
        ? catalogs?.services?.find((service) => service.id === item.serviceId)?.name ?? ''
        : '';
      return acc;
    }, {});
    setServiceSearch(initialSearchState);
  }, [initialValue, reset, replace, catalogs]);

  const items = watch('items');
  const discountTotal = Number(watch('discountTotal') || 0);
  const paidAmount = Number(watch('paidAmount') || 0);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0),
    [items]
  );

  const total = Math.max(
    0,
    items.reduce((sum, item) => sum + Number(item.total || 0), 0) - discountTotal
  );

  const balance = Math.max(0, total - paidAmount);

  const recalculateItem = (index: number) => {
    const quantity = Number(watch(`items.${index}.quantity`) || 0);
    const unitPrice = Number(watch(`items.${index}.unitPrice`) || 0);
    const discount = Number(watch(`items.${index}.discountAmount`) || 0);
    const surcharge = Number(watch(`items.${index}.surchargeAmount`) || 0);

    const itemSubtotal = quantity * unitPrice;
    const itemTotal = Math.max(0, itemSubtotal - discount + surcharge);

    setValue(`items.${index}.subtotal`, itemSubtotal);
    setValue(`items.${index}.total`, itemTotal);
  };

  const getFilteredServices = (index: number) => {
    const term = String(serviceSearch[index] ?? '').trim().toLowerCase();

    if (!term) {
      return catalogs?.services ?? [];
    }

    return (catalogs?.services ?? []).filter((service) =>
      String(service.name ?? '').toLowerCase().includes(term)
    );
  };

  return (
    <form
      className="stack-gap"
      onSubmit={handleSubmit((values) => {
        if (!hideInitialPaymentFields && values.paidAmount > 0 && !values.initialPaymentMethodId) {
          alert('Debes seleccionar el método de pago del abono');
          return;
        }

        onSubmit({
          ...values,
          dueDate: values.dueDate || null,
          notes: values.notes || null,
          discountTotal: Number(values.discountTotal || 0),
          paidAmount: Number(values.paidAmount || 0),
          initialPaymentMethodId:
            !hideInitialPaymentFields && values.paidAmount > 0
              ? Number(values.initialPaymentMethodId)
              : null,
          initialPaymentReference:
            !hideInitialPaymentFields && values.paidAmount > 0
              ? values.initialPaymentReference || null
              : null,
          items: values.items.map((item) => ({
            ...item,
            color: null,
            brand: null,
            sizeReference: null,
            material: null,
            receivedCondition: null,
            workDetail: null,
            stains: null,
            damages: null,
            missingAccessories: null,
            internalObservations: null,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            discountAmount: Number(item.discountAmount),
            surchargeAmount: Number(item.surchargeAmount),
            subtotal: Number(item.subtotal),
            total: Number(item.total),
            customerObservations: item.customerObservations || null
          }))
        });
      })}
    >
      <FormSection title="Encabezado de la orden">
        <div className="form-grid">
          <label>
            <span>Cliente</span>
            <Select
              {...register('clientId', {
                valueAsNumber: true,
                required: 'Selecciona un cliente'
              })}
            >
              <option value={0}>Selecciona un cliente</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.firstName} {client.lastName}
                </option>
              ))}
            </Select>
            {errors.clientId && (
              <small className="error-text">{errors.clientId.message}</small>
            )}
          </label>

          <label>
            <span>Fecha promesa</span>
            <Input type="date" {...register('dueDate')} />
          </label>

          <label>
            <span>Descuento global</span>
            <Input
              type="number"
              step="0.01"
              {...register('discountTotal', { valueAsNumber: true })}
            />
          </label>

          <label>
            <span>Abono inicial</span>
            <Input
              type="number"
              step="0.01"
              {...register('paidAmount', { valueAsNumber: true })}
              disabled={hideInitialPaymentFields}
            />
          </label>

          {!hideInitialPaymentFields && paidAmount > 0 && (
            <>
              <label>
                <span>Método de pago</span>
                <Select
                  {...register('initialPaymentMethodId', { valueAsNumber: true })}
                >
                  <option value="">Seleccionar</option>
                  {catalogs?.paymentMethods.map((method) => (
                    <option key={method.id} value={method.id}>
                      {method.name}
                    </option>
                  ))}
                </Select>
              </label>

              <label>
                <span>Referencia</span>
                <Input {...register('initialPaymentReference')} />
              </label>
            </>
          )}

          <label className="full-span">
            <span>Notas generales</span>
            <Textarea {...register('notes')} />
          </label>
        </div>
      </FormSection>

      <FormSection title="Prendas / ítems">
        <div className="stack-gap">
          {fields.map((field, index) => (
            <div key={field.id} className="item-card">
              <div className="item-grid">
                <label>
                  <span>Buscar servicio</span>
                  <Input
                    placeholder="Escribe para filtrar servicios"
                    value={serviceSearch[index] ?? ''}
                    onChange={(e) =>
                      setServiceSearch((prev) => ({
                        ...prev,
                        [index]: e.target.value
                      }))
                    }
                  />
                </label>

                <label>
                  <span>Servicio</span>
                  <Select
                    {...register(`items.${index}.serviceId` as const, {
                      setValueAs: (value) => (value === '' ? null : Number(value))
                    })}
                    onChange={(e) => {
                      const serviceId =
                        e.target.value === '' ? null : Number(e.target.value);
                      setValue(`items.${index}.serviceId`, serviceId);

                      const selectedService = catalogs?.services?.find(
                        (service) => service.id === serviceId
                      );

                      if (selectedService) {
                        setValue(
                          `items.${index}.unitPrice`,
                          Number(selectedService.basePrice ?? 0)
                        );

                        const currentDescription = watch(`items.${index}.description`);
                        if (!currentDescription || !currentDescription.trim()) {
                          setValue(`items.${index}.description`, selectedService.name);
                        }

                        setServiceSearch((prev) => ({
                          ...prev,
                          [index]: selectedService.name
                        }));
                      }

                      recalculateItem(index);
                    }}
                  >
                    <option value="">Selecciona un servicio</option>
                    {getFilteredServices(index).map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name} - {currency(Number(service.basePrice ?? 0))}
                      </option>
                    ))}
                  </Select>
                </label>

                <label className="full-span">
                  <span>Descripción</span>
                  <Input
                    {...register(`items.${index}.description` as const, {
                      required: 'Describe la prenda o servicio'
                    })}
                  />
                </label>

                <label>
                  <span>Cantidad</span>
                  <Input
                    type="number"
                    step="0.01"
                    {...register(`items.${index}.quantity` as const, {
                      valueAsNumber: true,
                      onChange: () => recalculateItem(index)
                    })}
                  />
                </label>

                <label>
                  <span>Precio</span>
                  <Input
                    type="number"
                    step="0.01"
                    {...register(`items.${index}.unitPrice` as const, {
                      valueAsNumber: true,
                      onChange: () => recalculateItem(index)
                    })}
                  />
                </label>

                <label>
                  <span>Descuento</span>
                  <Input
                    type="number"
                    step="0.01"
                    {...register(`items.${index}.discountAmount` as const, {
                      valueAsNumber: true,
                      onChange: () => recalculateItem(index)
                    })}
                  />
                </label>

                <label>
                  <span>Recargo</span>
                  <Input
                    type="number"
                    step="0.01"
                    {...register(`items.${index}.surchargeAmount` as const, {
                      valueAsNumber: true,
                      onChange: () => recalculateItem(index)
                    })}
                  />
                </label>

                <label className="full-span">
                  <span>Observaciones</span>
                  <Textarea
                    {...register(`items.${index}.customerObservations` as const)}
                    placeholder="Ej: prenda delicada, mancha visible, entregar con cuidado..."
                  />
                </label>

                <label>
                  <span>Subtotal</span>
                  <Input
                    type="number"
                    step="0.01"
                    {...register(`items.${index}.subtotal` as const, {
                      valueAsNumber: true
                    })}
                  />
                </label>

                <label>
                  <span>Total</span>
                  <Input
                    type="number"
                    step="0.01"
                    {...register(`items.${index}.total` as const, {
                      valueAsNumber: true
                    })}
                  />
                </label>
              </div>

              {fields.length > 1 && (
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => remove(index)}
                >
                  Quitar ítem
                </Button>
              )}
            </div>
          ))}

          <Button
            type="button"
            variant="primary"
            style={{
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: '#ffffff',
              fontWeight: 600,
              borderRadius: 12,
              padding: '12px 18px',
              boxShadow: '0 6px 18px rgba(37, 99, 235, 0.35)',
              transition: 'all 0.2s ease',
              border: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow =
                '0 10px 24px rgba(37, 99, 235, 0.45)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow =
                '0 6px 18px rgba(37, 99, 235, 0.35)';
            }}
            onClick={() =>
              append({
                garmentTypeId: null,
                serviceId: null,
                description: '',
                quantity: 1,
                color: null,
                brand: null,
                sizeReference: null,
                material: null,
                receivedCondition: null,
                workDetail: null,
                stains: null,
                damages: null,
                missingAccessories: null,
                customerObservations: null,
                internalObservations: null,
                unitPrice: 0,
                discountAmount: 0,
                surchargeAmount: 0,
                subtotal: 0,
                total: 0
              })
            }
          >
            + Agregar ítem
          </Button>
        </div>
      </FormSection>

      <div className="totals-panel">
        <div>
          <span>Subtotal</span>
          <strong>{currency(subtotal)}</strong>
        </div>
        <div>
          <span>Descuento</span>
          <strong>{currency(discountTotal)}</strong>
        </div>
        <div>
          <span>Total</span>
          <strong>{currency(total)}</strong>
        </div>
        <div>
          <span>Saldo</span>
          <strong>{currency(balance)}</strong>
        </div>
      </div>

      <div className="form-actions">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
};