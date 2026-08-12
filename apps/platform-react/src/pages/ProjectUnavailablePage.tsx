import { useNavigate, useParams } from 'react-router-dom';

import { Button, Result } from '@/ui/ant';

export function ProjectUnavailablePage() {
  const navigate = useNavigate();
  const { projectId = '' } = useParams();
  return (
    <main className="system-result-page">
      <Result
        status="404"
        title="项目不可用"
        subTitle={`项目 ${projectId || '未知'} 不存在、已隐藏或当前入口不可访问。`}
        extra={
          <Button type="primary" onClick={() => navigate('/')}>
            返回首页
          </Button>
        }
      />
    </main>
  );
}
