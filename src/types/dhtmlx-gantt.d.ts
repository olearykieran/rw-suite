// src/types/dhtmlx-gantt.d.ts

declare module "dhtmlx-gantt" {
  interface GanttConfig {
    date_format: string;
    columns: any[];
    // Add any other config properties you need
  }

  interface GanttStatic {
    config: GanttConfig;

    // Methods you want typed
    clearAll(): void;
    init(container: HTMLElement | string): void;
    parse(data: any): void;
    attachEvent(eventName: string, handler: (...args: any[]) => any): void;

    // etc...
  }

  const gantt: GanttStatic;
  export default gantt;
}
