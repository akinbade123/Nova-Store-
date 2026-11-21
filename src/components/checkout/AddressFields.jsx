import { SelectField, TextField } from '../ui/Field';
import { COUNTRIES, countryByCode, isPostalOptional } from '../../utils/validation';
import { addressField } from './checkoutSchema';

/** Shared delivery / billing address block. `prefix` namespaces the field names. */
export function AddressFields({ form, prefix = '', autoCompleteSection = 'shipping' }) {
  const f = (key) => addressField(prefix, key);
  const ac = (token) => `section-${autoCompleteSection} ${autoCompleteSection} ${token}`;
  const country = countryByCode(form.values[f('country')]);

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-6">
      <SelectField label="Country / region" className="col-span-2 sm:col-span-6" autoComplete={ac('country')} {...form.field(f('country'))}>
        {COUNTRIES.map((option) => (
          <option key={option.code} value={option.code}>
            {option.name}
          </option>
        ))}
      </SelectField>
      <TextField label="First name" autoComplete={ac('given-name')} className="col-span-2 sm:col-span-3" {...form.field(f('firstName'))} />
      <TextField label="Last name" autoComplete={ac('family-name')} className="col-span-2 sm:col-span-3" {...form.field(f('lastName'))} />
      <TextField label="Street address" autoComplete={ac('address-line1')} placeholder="House number and street" className="col-span-2 sm:col-span-6" {...form.field(f('address1'))} />
      <TextField label="Apartment, suite, etc." optional autoComplete={ac('address-line2')} className="col-span-2 sm:col-span-6" {...form.field(f('address2'))} />
      <TextField label="City" autoComplete={ac('address-level2')} className="col-span-2" {...form.field(f('city'))} />
      <TextField
        label={country.regionLabel}
        optional={!country.regionRequired}
        autoComplete={ac('address-level1')}
        className="sm:col-span-2"
        {...form.field(f('region'))}
      />
      <TextField
        label={country.postalLabel}
        optional={isPostalOptional(country.code)}
        autoComplete={ac('postal-code')}
        autoCapitalize="characters"
        className="sm:col-span-2"
        {...form.field(f('postalCode'))}
      />
    </div>
  );
}
