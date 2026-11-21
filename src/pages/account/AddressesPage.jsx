import { useState } from 'react';
import { MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Sheet } from '../../components/ui/Sheet';
import { Skeleton } from '../../components/ui/Skeleton';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { CheckboxField, TextField, fieldId } from '../../components/ui/Field';
import { AddressFields } from '../../components/checkout/AddressFields';
import { validateAddress } from '../../components/checkout/checkoutSchema';
import { AccountSection } from '../../layouts/AccountLayout';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { useForm } from '../../hooks/useForm';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { addressService } from '../../services/addressService';
import { countryByCode, validatePhone } from '../../utils/validation';
import { cn } from '../../utils/cn';

const LABELS = ['Home', 'Work', 'Other'];

const blankAddress = (user) => ({
  label: 'Home',
  firstName: user.firstName,
  lastName: user.lastName,
  address1: '',
  address2: '',
  city: '',
  region: '',
  postalCode: '',
  country: 'US',
  phone: '',
  isDefault: false,
});

const validate = (values) => {
  const errors = {};
  validateAddress(values, '', errors);
  const phone = validatePhone(values.phone);
  if (phone) errors.phone = phone;
  return errors;
};

function AddressForm({ initial, onSave, onCancel, isOnlyAddress }) {
  const form = useForm(initial, validate);
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const first = Object.keys(form.submit())[0];
    if (first) {
      document.getElementById(fieldId(first))?.focus();
      return;
    }
    setSaving(true);
    try {
      await onSave(form.values);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form id="address-form" onSubmit={submit} noValidate className="px-5 py-6 sm:px-6">
      <fieldset disabled={saving} className="space-y-6">
        <div role="radiogroup" aria-label="Address label" className="flex gap-2">
          {LABELS.map((label) => (
            <label key={label} className="cursor-pointer">
              <input
                type="radio"
                name="label"
                value={label}
                checked={form.values.label === label}
                onChange={() => form.setField('label', label)}
                className="peer sr-only"
              />
              <span
                className={cn(
                  'inline-flex h-9 items-center rounded-full px-4 text-[13px] font-medium transition-colors',
                  'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent',
                  form.values.label === label ? 'bg-ink text-white' : 'ring-1 ring-inset ring-line-strong hover:ring-ink',
                )}
              >
                {label}
              </span>
            </label>
          ))}
        </div>
        <AddressFields form={form} />
        <TextField label="Phone" type="tel" inputMode="tel" autoComplete="tel" hint="Used by the courier if they need to reach you." {...form.field('phone')} />
        {!isOnlyAddress && (
          <CheckboxField
            name="isDefault"
            label="Use as my default address"
            description="We’ll fill this in for you at checkout."
            checked={form.values.isDefault}
            onChange={(event) => form.setField('isDefault', event.target.checked)}
          />
        )}
      </fieldset>
      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          Save address
        </Button>
      </div>
    </form>
  );
}

export default function AddressesPage() {
  useDocumentTitle('Addresses');
  const { user } = useAuth();
  const { toast } = useToast();
  const { data, loading } = useAsync(() => addressService.list(user.id), [user.id]);
  const [list, setList] = useState(null);
  const [editing, setEditing] = useState(null); // address object (new or existing)
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const addresses = list ?? data ?? [];

  const save = async (values) => {
    try {
      const next = await addressService.save(user.id, { ...editing, ...values });
      setList(next);
      setEditing(null);
      toast({ title: editing.id ? 'Address updated' : 'Address added' });
    } catch (err) {
      toast({ variant: 'error', title: 'Couldn’t save address', description: err.userMessage });
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      setList(await addressService.remove(user.id, deleting.id));
      toast({ title: 'Address deleted' });
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  };

  const makeDefault = async (address) => {
    setList(await addressService.setDefault(user.id, address.id));
    toast({ title: 'Default address updated', description: `${address.label} — ${address.address1}` });
  };

  return (
    <AccountSection
      title="Addresses"
      description="Saved addresses make checkout faster. Your default is filled in automatically."
      action={
        addresses.length > 0 && (
          <Button size="sm" onClick={() => setEditing(blankAddress(user))}>
            <Plus className="size-4" aria-hidden="true" />
            Add address
          </Button>
        )
      }
    >
      {loading && !list ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-52 rounded-3xl" />
          <Skeleton className="h-52 rounded-3xl" />
        </div>
      ) : addresses.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl bg-surface px-6 py-16 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-white">
            <MapPin className="size-7" strokeWidth={1.5} aria-hidden="true" />
          </span>
          <p className="mt-5 font-display text-xl font-semibold">No saved addresses</p>
          <p className="mt-2 max-w-sm text-sm text-muted">Add your home or work address so it’s ready at checkout.</p>
          <Button className="mt-7" onClick={() => setEditing(blankAddress(user))}>
            <Plus className="size-4" aria-hidden="true" />
            Add an address
          </Button>
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {addresses.map((address) => (
            <li
              key={address.id}
              className={cn('flex flex-col rounded-3xl p-6 ring-inset', address.isDefault ? 'ring-2 ring-ink' : 'ring-1 ring-line')}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">{address.label}</p>
                {address.isDefault && (
                  <span className="rounded-full bg-ink px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">Default</span>
                )}
              </div>
              <address className="mt-3 flex-1 text-sm not-italic leading-relaxed text-ink/75">
                <span className="font-medium text-ink">
                  {address.firstName} {address.lastName}
                </span>
                <br />
                {[address.address1, address.address2].filter(Boolean).join(', ')}
                <br />
                {[address.city, address.region, address.postalCode].filter(Boolean).join(', ')}
                <br />
                {countryByCode(address.country).name}
                {address.phone && (
                  <>
                    <br />
                    <span className="text-muted">{address.phone}</span>
                  </>
                )}
              </address>
              <div className="mt-5 flex flex-wrap items-center gap-1 border-t border-line pt-4">
                <button
                  type="button"
                  onClick={() => setEditing(address)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium hover:bg-surface"
                >
                  <Pencil className="size-3.5" aria-hidden="true" />
                  Edit<span className="sr-only"> {address.label} address</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeleting(address)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-muted hover:bg-surface hover:text-danger"
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                  Delete<span className="sr-only"> {address.label} address</span>
                </button>
                {!address.isDefault && (
                  <button
                    type="button"
                    onClick={() => makeDefault(address)}
                    className="ml-auto h-9 rounded-full px-3 text-[13px] font-medium underline underline-offset-4 hover:text-muted"
                  >
                    Set as default
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={Boolean(editing)} onClose={() => setEditing(null)} side="center" title={editing?.id ? 'Edit address' : 'Add a new address'} className="sm:max-w-xl">
        {editing && (
          <AddressForm
            key={editing.id ?? 'new'}
            initial={{ ...blankAddress(user), ...editing }}
            onSave={save}
            onCancel={() => setEditing(null)}
            isOnlyAddress={addresses.length === 0 || (addresses.length === 1 && editing.id === addresses[0].id)}
          />
        )}
      </Sheet>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        loading={busy}
        title="Delete this address?"
        confirmLabel="Delete address"
      >
        {deleting && (
          <>
            <span className="font-semibold text-ink">{deleting.label}</span> — {deleting.address1}, {deleting.city} will be removed from
            your account.{deleting.isDefault && ' Another saved address will become your default.'}
          </>
        )}
      </ConfirmDialog>
    </AccountSection>
  );
}
