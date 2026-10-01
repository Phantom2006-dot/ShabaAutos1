import { useEffect, useState } from 'react';
import { fetchPublicSettings } from '../services/api';

export interface BusinessContact {
  phone: string;
  email: string;
  address: string;
}

const empty: BusinessContact = { phone: '', email: '', address: '' };

/** Contact details are absent until an administrator has verified and published them in CMS. */
export function useBusinessContact(): BusinessContact {
  const [contact, setContact] = useState<BusinessContact>(empty);
  useEffect(() => {
    let active = true;
    fetchPublicSettings().then((settings) => {
      if (!active) return;
      const value = (key: string) => typeof settings[key]?.value === 'string' ? String(settings[key].value).trim() : '';
      setContact({ phone: value('site.contact_phone'), email: value('site.contact_email'), address: value('site.address') });
    }).catch(() => { if (active) setContact(empty); });
    return () => { active = false; };
  }, []);
  return contact;
}
