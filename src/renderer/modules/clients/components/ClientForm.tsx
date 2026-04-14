import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { Client, ClientInput } from '@shared/types';
import { Button, FormSection, Input, Textarea } from '@renderer/ui/components';

const emptyForm: ClientInput = { firstName: '', lastName: '', phone: '', email: null, address: null, notes: null };

export const ClientForm = ({ initialValue, onSubmit, onCancel }: { initialValue?: Client | null; onSubmit: (value: ClientInput) => void; onCancel?: () => void }) => {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ClientInput>({ defaultValues: emptyForm });

  useEffect(() => {
    reset(initialValue ? {
      firstName: initialValue.firstName,
      lastName: initialValue.lastName,
      phone: initialValue.phone,
      email: initialValue.email,
      address: initialValue.address,
      notes: initialValue.notes
    } : emptyForm);
  }, [initialValue, reset]);

  return (
    <form className="stack-gap" onSubmit={handleSubmit((values) => onSubmit({
      ...values,
      email: values.email || null,
      address: values.address || null,
      notes: values.notes || null
    }))}>
      <FormSection title="Datos del cliente">
        <div className="form-grid">
          <label><span>Nombres</span><Input {...register('firstName', { required: 'Requerido' })} />{errors.firstName && <small className="error-text">{errors.firstName.message}</small>}</label>
          <label><span>Apellidos</span><Input {...register('lastName', { required: 'Requerido' })} />{errors.lastName && <small className="error-text">{errors.lastName.message}</small>}</label>
          <label><span>Teléfono</span><Input {...register('phone', { required: 'Requerido' })} />{errors.phone && <small className="error-text">{errors.phone.message}</small>}</label>
          <label><span>Email</span><Input {...register('email')} /></label>
          <label className="full-span"><span>Dirección</span><Input {...register('address')} /></label>
          <label className="full-span"><span>Notas</span><Textarea {...register('notes')} /></label>
        </div>
      </FormSection>
      <div className="form-actions">
        {onCancel && <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>}
        <Button type="submit">Guardar cliente</Button>
      </div>
    </form>
  );
};
