// 公共契约

/** 模块注册信息，每个模块入口需通过 register() 返回此结构 */
export interface ModuleRegistration {
  /** 唯一标识，与目录名一致 */
  id: string;
  /** i18n 键，用于卡片标题与详情页标题 */
  nameKey: string;
  /** i18n 键，用于卡片副标题/简介（可选） */
  descriptionKey?: string;
  /** lucide 图标名（kebab-case，如 "satellite-dish"），用于卡片图标（可选） */
  icon?: string;
  /** 挂载到宿主容器（详情页内容区） */
  mount(container: HTMLElement): void;
  /** 可选：卸载时清理（移除监听、定时器等） */
  unmount?(): void;
}
