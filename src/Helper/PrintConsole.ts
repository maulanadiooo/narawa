export class PrintConsole {
    private readonly red = "31";
    private readonly green = "32";
    private readonly yellow = "33";
    private readonly blue = "34";

    private timeString = (): string => {
        const time = new Date();
        const year = time.getFullYear();
        const month = time.getMonth();
        const date = time.getDate();
        const minutes = time.getMinutes();
        const hours = time.getHours();
        const seconds = time.getSeconds();
        const timeString = `${year}-${String(month).padStart(2, "0")}-${String(date).padStart(2, "0")} ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
        return timeString;
    }

    success = (text: string) => {
        console.log(`\x1b[${this.green}m%s\x1b[0m`, `✅ ${this.timeString()}:::: ${text} `);
    }

    error = (text: string) => {
        console.log(`\x1b[${this.red}m%s\x1b[0m`, `❌ ${this.timeString()}:::: ${text} `);
    }

    warning = (text: string) => {
        console.log(`\x1b[${this.yellow}m%s\x1b[0m`, `⚠️ ${this.timeString()}:::: ${text} `);
    }

    info = (text: string) => {
        console.log(`\x1b[${this.blue}m%s\x1b[0m`, `ℹ️  ${this.timeString()}:::: ${text} `);
    }
}


