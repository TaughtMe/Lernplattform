-- Die Inhaltsübertragung (verschlüsselte Vokabelpakete, höchstens 24 Stunden
-- gespeichert) ruft vier Funktionen mit dem anon-Schlüssel auf. Migrationen,
-- die alle Funktionen in public sperren (z. B. aus dem Laufdiktat-Raum),
-- haben diese Rechte wiederholt entzogen; Folge war
-- "permission denied for function reserve_content_transfer".
-- Die Migration ist idempotent und gibt genau diese vier Funktionen frei.
revoke all on function public.reserve_content_transfer(text, text, bigint, integer)
  from public, authenticated;
revoke all on function public.upload_content_transfer(uuid, text, text, text, text, text, jsonb)
  from public, authenticated;
revoke all on function public.retrieve_content_transfer_by_qr(uuid, text)
  from public, authenticated;
revoke all on function public.retrieve_content_transfer_by_code(text)
  from public, authenticated;

grant execute on function public.reserve_content_transfer(text, text, bigint, integer),
  public.upload_content_transfer(uuid, text, text, text, text, text, jsonb),
  public.retrieve_content_transfer_by_qr(uuid, text),
  public.retrieve_content_transfer_by_code(text)
  to anon;
