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

/** Renders a stored Nigerian number in a readable, human format. */
export function formatContactPhone(raw: string): string {
  const value = (raw || '').trim();
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('234') && digits.length === 13) {
    return `+234 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
  }
  if (digits.startsWith('0') && digits.length === 11) {
    return `+234 ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `+234 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  return value;
}

/** Normalises a stored number into an international dialling value. */
export function toDialNumber(raw: string): string {
  const value = (raw || '').trim();
  if (!value) return '';
  if (value.startsWith('+')) return value.replace(/[^\d+]/g, '');
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('234')) return `+${digits}`;
  if (digits.startsWith('0')) return `+234${digits.slice(1)}`;
  return `+234${digits}`;
}
