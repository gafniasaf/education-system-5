-- Update auth configuration to disable email confirmation for easier testing
UPDATE auth.config SET 
  site_url = 'https://a6ceedf2-8e35-4ef3-b229-6f3acfc2482f.sandbox.lovable.dev',
  external_email_enabled = true,
  external_phone_enabled = false,
  email_confirm = false,
  email_change_confirm = false,
  sms_confirm = false
WHERE true;