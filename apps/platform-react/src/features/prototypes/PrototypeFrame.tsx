import { useEffect, useRef, useState } from 'react';

import type { HtmlPrototypePage, PrdBinding } from '../../../../../packages/platform-contracts/src/index.js';
import { clearPrdBindingMarkers, installPrdBindingMarkers } from '@/features/docs/prd-binding-markers';
import { installFrameSmoothScroll } from '@/features/motion/smooth-scroll';
import { Button, Result, Spin, Typography } from '@/ui/ant';
import { ReloadOutlined } from '@/ui/ant/icons';

const { Text } = Typography;

export interface PrototypeFrameProps {
  page: HtmlPrototypePage;
  source: string;
  theme: {
    primary: string;
    primaryHover?: string;
    primaryActive?: string;
    pageBackground?: string;
  };
  prdBindings: PrdBinding[];
  onOpenPrd: (target: { documentPath: string; anchor?: string }) => void;
  onLoad: (frame: HTMLIFrameElement) => void;
}

export function PrototypeFrame({ page, source, theme, prdBindings, onOpenPrd, onLoad }: PrototypeFrameProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [loadVersion, setLoadVersion] = useState(0);
  const [frameState, setFrameState] = useState<{
    source: string;
    status: 'loading' | 'ready' | 'error';
  }>({ source, status: 'loading' });
  const [retryVersion, setRetryVersion] = useState(0);
  const frameStatus = frameState.source === source ? frameState.status : 'loading';

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const handleError = () => setFrameState({ source, status: 'error' });
    frame.addEventListener('error', handleError);
    return () => frame.removeEventListener('error', handleError);
  }, [retryVersion, source]);

  useEffect(() => {
    const frameDocument = frameRef.current?.contentDocument;
    if (!frameDocument) return;
    installPrdBindingMarkers(frameDocument, prdBindings, (binding) =>
      onOpenPrd({ documentPath: binding.prd.document, anchor: binding.prd.anchor }),
    );
    return () => clearPrdBindingMarkers(frameDocument);
  }, [loadVersion, onOpenPrd, prdBindings]);

  function handleLoad(frame: HTMLIFrameElement) {
    try {
      const frameDocument = frame.contentDocument;
      if (frameDocument) installFrameSmoothScroll(frameDocument);
      const root = frameDocument?.documentElement;
      root?.style.setProperty('--app-color-primary', theme.primary);
      root?.style.setProperty('--el-color-primary', theme.primary);
      root?.style.setProperty('--prototype-color-primary', theme.primary);
      if (theme.primaryHover) root?.style.setProperty('--app-color-primary-hover', theme.primaryHover);
      if (theme.primaryActive) root?.style.setProperty('--app-color-primary-active', theme.primaryActive);
      if (theme.pageBackground) root?.style.setProperty('--app-color-page', theme.pageBackground);
    } catch {
      // 同源页面会同步项目主题；跨域页面保持自己的主题，不阻塞加载。
    }
    setFrameState({ source, status: 'ready' });
    setLoadVersion((version) => version + 1);
    onLoad(frame);
  }

  function retry() {
    setFrameState({ source, status: 'loading' });
    setRetryVersion((version) => version + 1);
  }

  return (
    <div className="prototype-frame-host" aria-busy={frameStatus === 'loading'}>
      {frameStatus === 'loading' ? (
        <div className="prototype-frame-state" role="status">
          <Spin size="large" />
          <Text type="secondary">正在加载原型页面…</Text>
        </div>
      ) : null}
      {frameStatus === 'error' ? (
        <div className="prototype-frame-state prototype-frame-state--error">
          <Result
            status="error"
            title="原型页面加载失败"
            subTitle="请确认原型文件仍然存在，并检查当前网络或局域网服务是否可访问。"
            extra={
              <Button type="primary" icon={<ReloadOutlined />} onClick={retry}>
                重新加载
              </Button>
            }
          />
        </div>
      ) : null}
      <iframe
        key={`${source}:${retryVersion}`}
        className="prototype-frame"
        ref={frameRef}
        src={source}
        scrolling="auto"
        title={page.title}
        referrerPolicy="same-origin"
        onLoad={(event) => handleLoad(event.currentTarget)}
      />
    </div>
  );
}
