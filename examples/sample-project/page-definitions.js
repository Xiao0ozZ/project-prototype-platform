export const clientPageDefinitions = {
  admin: {
    basePath: '/admin',
    sections: [{ id: 'workspace', title: '工作区' }],
    pages: [
      {
        path: 'overview',
        name: 'admin-overview',
        title: '项目概览',
        view: 'admin/OverviewView.vue',
        section: 'workspace',
        icon: 'DataBoard',
      },
      // <generator:admin-pages>
    ],
  },
};
