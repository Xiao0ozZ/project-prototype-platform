import { useNavigate } from 'react-router-dom';

import { Button, Result } from '@/ui/ant';

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <main className="system-result-page">
      <Result
        status="404"
        title="页面不存在"
        subTitle="当前地址没有对应的平台页面或兼容入口。"
        extra={
          <Button type="primary" onClick={() => navigate('/')}>
            返回首页
          </Button>
        }
      />
    </main>
  );
}
