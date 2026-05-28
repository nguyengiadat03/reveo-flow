grant usage on schema public to anon, authenticated;

grant select on table
  public.profiles,
  public.workspaces,
  public.workflows,
  public.render_jobs,
  public.provider_accounts
to anon;

grant select, insert, update, delete on table
  public.profiles,
  public.workspaces,
  public.workflows,
  public.render_jobs,
  public.provider_accounts
to authenticated;
