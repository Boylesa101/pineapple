import { redirect } from 'next/navigation';

export default async function WebsiteHome(props: PageProps<'/website/[orgId]'>) {
  const { orgId } = await props.params;
  redirect(`/website/${orgId}/blog`);
}
