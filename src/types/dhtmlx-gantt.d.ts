// src/types/dhtmlx-gantt.d.ts

declare module "dhtmlx-gantt" {
  interface GanttConfig {
    date_format?: string; // existing
    columns?: any[]; // existing

    // NEW: recommended additions
    scales?: Array<{
      unit: string;
      step: number;
      format?: string;
    }>;

    xml_date?: string;
    min_column_width?: number;
    work_time?: boolean;

    // Start/End range for chart
    start_date?: Date;
    end_date?: Date;

    // ...any other config you need
  }

  interface GanttStatic {
    config: GanttConfig;

    // already declared
    clearAll(): void;
    init(container: HTMLElement | string): void;
    parse(data: any): void;
    attachEvent(eventName: string, handler: (...args: any[]) => any): void;

    // NEW: missing methods
    setWorkTime(config: {
      day?: number | number[];
      date?: Date;
      hours?: boolean | string;
    }): void;
    getTask(id: string | number): any;

    setSkin(skin: string): void;

    // any other methods you need typed
  }

  const gantt: GanttStatic;
  export default gantt;
}
