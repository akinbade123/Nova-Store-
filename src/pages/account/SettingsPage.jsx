import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { PasswordField, TextField, fieldId } from '../../components/ui/Field';
import { PasswordStrength, passwordError } from '../../components/auth/PasswordStrength';
import { AccountSection } from '../../layouts/AccountLayout';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useForm } from '../../hooks/useForm';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { EMAIL_PATTERN } from '../../utils/validation';
import { cn } from '../../utils/cn';

function Panel({ title, description, children, tone }) {
  return (
    <section
      className={cn(
        'grid gap-6 rounded-3xl p-6 ring-1 ring-inset sm:p-8 xl:grid-cols-[260px_1fr] xl:gap-10',
        tone === 'danger' ? 'ring-danger/25' : 'ring-line',
      )}
    >
      <div>
        <h3 className={cn('font-sans text-base font-semibold tracking-normal', tone === 'danger' && 'text-danger')}>{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">{description}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function focusFirst(errors) {
  const first = Object.keys(errors)[0];
  if (first) document.getElementById(fieldId(first))?.focus();
  return Boolean(first);
}

/* ---------------- Personal details ---------------- */

const validateDetails = (values) => {
  const errors = {};
  if (!values.firstName.trim()) errors.firstName = 'Enter your first name';
  if (!values.lastName.trim()) errors.lastName = 'Enter your last name';
  if (!values.email.trim()) errors.email = 'Enter your email address';
  else if (!EMAIL_PATTERN.test(values.email.trim())) errors.email = 'Enter a valid email, like name@example.com';
  return errors;
};

function DetailsForm() {
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();
  const form = useForm({ firstName: user.firstName, lastName: user.lastName, email: user.email }, validateDetails);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState({});
  const changed = ['firstName', 'lastName', 'email'].some((key) => form.values[key].trim() !== user[key]);

  const submit = async (event) => {
    event.preventDefault();
    setServerError({});
    if (focusFirst(form.submit())) return;
    setSaving(true);
    try {
      await updateProfile(form.values);
      toast({ title: 'Details saved' });
    } catch (err) {
      if (err.code === 'email_taken') {
        setServerError({ email: err.userMessage });
        document.getElementById(fieldId('email'))?.focus();
      } else {
        toast({ variant: 'error', title: 'Couldn’t save details', description: err.userMessage });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <fieldset disabled={saving} className="grid gap-5 sm:grid-cols-2">
        <TextField label="First name" autoComplete="given-name" {...form.field('firstName')} />
        <TextField label="Last name" autoComplete="family-name" {...form.field('lastName')} />
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          className="sm:col-span-2"
          hint="Order confirmations and receipts are sent here."
          {...form.field('email')}
          error={form.errors.email ?? serverError.email}
        />
      </fieldset>
      <Button type="submit" className="mt-6" loading={saving} disabled={!changed}>
        Save changes
      </Button>
    </form>
  );
}

/* ---------------- Password ---------------- */

const validatePassword = (values) => {
  const errors = {};
  if (!values.current) errors.current = 'Enter your current password';
  const next = passwordError(values.next);
  if (next) errors.next = next;
  else if (values.next === values.current) errors.next = 'Choose a password you haven’t used here';
  return errors;
};

/** Remounts the form after a successful change so every field starts empty. */
function PasswordSection() {
  const [version, setVersion] = useState(0);
  return <PasswordForm key={version} onChanged={() => setVersion((value) => value + 1)} />;
}

function PasswordForm({ onChanged }) {
  const { changePassword } = useAuth();
  const { toast } = useToast();
  const form = useForm({ current: '', next: '' }, validatePassword);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setServerError('');
    if (focusFirst(form.submit())) return;
    setSaving(true);
    try {
      await changePassword(form.values.current, form.values.next);
      toast({ title: 'Password updated', description: 'Use your new password next time you sign in.' });
      onChanged();
    } catch (err) {
      setServerError(err.userMessage ?? 'We couldn’t update your password.');
      document.getElementById(fieldId('current'))?.focus();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <fieldset disabled={saving} className="space-y-5">
        <PasswordField label="Current password" autoComplete="current-password" {...form.field('current')} error={form.errors.current ?? (serverError || undefined)} />
        <PasswordField label="New password" autoComplete="new-password" {...form.field('next')}>
          <PasswordStrength value={form.values.next} />
        </PasswordField>
      </fieldset>
      <Button type="submit" className="mt-6" loading={saving}>
        Update password
      </Button>
    </form>
  );
}

/* ---------------- Preferences ---------------- */

function Toggle({ label, description, checked, onChange, disabled }) {
  return (
    <label className={cn('flex cursor-pointer items-start justify-between gap-6 py-4', disabled && 'cursor-wait opacity-60')}>
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="mt-0.5 block text-[13px] text-muted">{description}</span>
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={onChange} disabled={disabled} className="peer sr-only" />
      <span
        aria-hidden="true"
        className={cn(
          'relative mt-0.5 h-6 w-10 shrink-0 rounded-full transition-colors duration-200',
          'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent',
          checked ? 'bg-ink' : 'bg-line-strong',
        )}
      >
        <span className={cn('absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out-soft', checked && 'translate-x-4')} />
      </span>
    </label>
  );
}

function Preferences() {
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();
  const [pending, setPending] = useState(null);

  const set = async (key, value, message) => {
    setPending(key);
    try {
      await updateProfile({ [key]: value });
      toast({ title: 'Preferences saved', description: message });
    } catch (err) {
      toast({ variant: 'error', title: 'Couldn’t save preference', description: err.userMessage });
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="divide-y divide-line">
      <Toggle
        label="New arrivals and offers"
        description="A weekly email with new products and member-only discounts."
        checked={Boolean(user.marketing)}
        disabled={pending === 'marketing'}
        onChange={(event) => set('marketing', event.target.checked, event.target.checked ? 'You’re subscribed to offers.' : 'You won’t receive marketing emails.')}
      />
      <Toggle
        label="Delivery updates by SMS"
        description="Texts when your order ships and when it’s out for delivery."
        checked={user.smsUpdates ?? true}
        disabled={pending === 'smsUpdates'}
        onChange={(event) => set('smsUpdates', event.target.checked, event.target.checked ? 'SMS updates are on.' : 'SMS updates are off.')}
      />
      <div className="py-4">
        <p className="text-sm font-medium">Order and account emails</p>
        <p className="mt-0.5 text-[13px] text-muted">Receipts, shipping and security emails are always sent.</p>
      </div>
    </div>
  );
}

/* ---------------- Delete account ---------------- */

function DeleteAccount() {
  const { deleteAccount, signOut } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const confirm = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      await signOut({ to: '/' });
      toast({ variant: 'info', title: 'Your account has been deleted', description: 'We’re sorry to see you go.' });
    } catch (err) {
      setDeleting(false);
      toast({ variant: 'error', title: 'Couldn’t delete account', description: err.userMessage });
    }
  };

  return (
    <>
      <p className="text-sm leading-relaxed text-ink/75">
        This permanently removes your profile, saved addresses and preferences. Past orders are kept for our records as required by law.
      </p>
      <Button variant="danger-outline" className="mt-5" onClick={() => setOpen(true)}>
        Delete account
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => {
          setOpen(false);
          setConfirmText('');
        }}
        onConfirm={confirm}
        loading={deleting}
        confirmDisabled={confirmText !== 'DELETE'}
        title="Delete your account?"
        confirmLabel="Delete permanently"
      >
        <p>This can’t be undone. You’ll be signed out and your saved details will be erased.</p>
        <TextField
          name="confirm-delete"
          label={
            <>
              Type <span className="font-mono font-semibold">DELETE</span> to confirm
            </>
          }
          className="mt-5"
          autoComplete="off"
          autoCapitalize="characters"
          value={confirmText}
          onChange={(event) => setConfirmText(event.target.value)}
        />
      </ConfirmDialog>
    </>
  );
}

export default function SettingsPage() {
  useDocumentTitle('Account settings');
  return (
    <AccountSection title="Settings" description="Manage your details, password and communication preferences.">
      <div className="space-y-5">
        <Panel title="Personal details" description="Your name and the email you sign in with.">
          <DetailsForm />
        </Panel>
        <Panel title="Password" description="Use at least 8 characters with a mix of upper and lowercase letters and a number.">
          <PasswordSection />
        </Panel>
        <Panel title="Communication" description="Choose what we send you. Changes save instantly.">
          <Preferences />
        </Panel>
        <Panel title="Delete account" description="Permanently close your NOVA account." tone="danger">
          <DeleteAccount />
        </Panel>
      </div>
    </AccountSection>
  );
}
