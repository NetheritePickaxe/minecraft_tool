// 公共契约

/** 模块注册信息，每个模块入口需通过 register() 返回此结构 */
export interface ModuleRegistration {
  /** 唯一标识，与目录名一致 */
  id: string;
  /** i18n 键，用于侧边栏/菜单显示模块名 */
  nameKey: string;
  /** 挂载到宿主容器（内容区） */
  mount(container: HTMLElement): void;
  /** 可选：卸载时清理（移除监听、定时器等） */
  unmount?(): void;
}
