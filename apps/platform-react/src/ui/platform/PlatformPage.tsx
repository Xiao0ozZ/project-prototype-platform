import type { ReactNode } from 'react';

import { Flex, Typography } from '@/ui/ant';

const { Title, Text } = Typography;

interface PlatformPageProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function PlatformPage({ eyebrow, title, description, actions, children }: PlatformPageProps) {
  return (
    <main className="platform-page platform-page--ant">
      <Flex className="platform-page__heading" align="center" justify="space-between" gap={24}>
        <div>
          {eyebrow ? <Text className="platform-page__eyebrow">{eyebrow}</Text> : null}
          <Title level={1}>{title}</Title>
          {description ? <Text type="secondary">{description}</Text> : null}
        </div>
        {actions ? (
          <Flex className="platform-page__actions" gap={8} wrap="wrap">
            {actions}
          </Flex>
        ) : null}
      </Flex>
      <div className="platform-page__content">{children}</div>
    </main>
  );
}
