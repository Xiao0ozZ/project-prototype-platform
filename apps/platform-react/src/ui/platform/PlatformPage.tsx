import { useEffect, type ReactNode } from 'react';

import { Flex } from '@/ui/ant';

interface PlatformPageProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function PlatformPage({ title, description, actions, children }: PlatformPageProps) {
  useEffect(() => {
    document.title = `${title} · 产品功能体验中心`;
  }, [title]);

  return (
    <main
      className="platform-page platform-page--ant"
      aria-label={title}
      data-description={description || undefined}
    >
      {actions ? (
        <Flex className="platform-page__heading" align="center" justify="flex-end" gap={8} wrap="wrap">
          {actions}
        </Flex>
      ) : null}
      <div className="platform-page__content">{children}</div>
    </main>
  );
}
