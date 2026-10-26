import { useApp, usePageTitle } from '../../lib/app-context';
import type { CommonDict } from '../../i18n/common';
import { HeroTitle, PageBody, PageHero } from '../../components/layout/PageHero';
import { ButtonLink } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/States';

/** Placeholder for screens that exist in the design but are not converted yet. */
export function ComingSoonPage({ titleKey }: { titleKey: keyof CommonDict['nav'] }) {
  const { t } = useApp();
  const title = t.nav[titleKey];
  usePageTitle(title);
  return (
    <>
      <PageHero crumb={title}>
        <HeroTitle title={title} />
      </PageHero>
      <PageBody>
        <EmptyState
          icon="spark"
          title={t.comingSoon.title}
          body={t.comingSoon.body}
          action={
            <ButtonLink to="/" variant="primary" size="lg">
              {t.comingSoon.back}
            </ButtonLink>
          }
        />
      </PageBody>
    </>
  );
}
