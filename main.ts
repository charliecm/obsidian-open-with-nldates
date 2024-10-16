import { Notice, Plugin, SuggestModal } from "obsidian";
import {
	createDailyNote,
	getAllDailyNotes,
	getDailyNote,
} from "obsidian-daily-notes-interface";

export default class MyPlugin extends Plugin {
	async onload() {
		this.addCommand({
			id: "open-daily-note",
			name: "Open daily note",
			icon: "calendar-search",
			callback: () => {
				const modal = new OpenDailyNoteModal(this.app);
				modal.setPlaceholder("Open daily note by date…");
				modal.open();
			},
		});
	}
}

export class OpenDailyNoteModal extends SuggestModal<string> {
	// Based on https://github.com/argenos/nldates-obsidian/blob/58849aa1bf73ab8cb4febc7c83807e27454c4d82/src/suggest/date-suggest.ts#L48
	getSuggestions(query: string): string[] {
		let suggestions = [];
		const referencePrefix = query.match(/(next|last|this)/i);
		const relativeDate =
			query.match(/^in ([+-]?\d+)/i) || query.match(/^([+-]?\d+)/i);
		// Check for time prefix
		if (query.match(/^time/)) {
			suggestions = [
				"now",
				"+15 minutes",
				"+1 hour",
				"-15 minutes",
				"-1 hour",
			]
				.map((value) => `time:${value}`)
				.filter((item) => item.toLowerCase().startsWith(query));
		} else if (referencePrefix) {
			suggestions = [
				"week",
				"month",
				"year",
				"Sunday",
				"Monday",
				"Tuesday",
				"Wednesday",
				"Thursday",
				"Friday",
				"Saturday",
			]
				.map((val) => `${referencePrefix[1]} ${val}`)
				.filter((item) => item.toLowerCase().startsWith(query));
		} else if (relativeDate) {
			const timeDelta = relativeDate[1];
			suggestions = [
				`in ${timeDelta} minutes`,
				`in ${timeDelta} hours`,
				`in ${timeDelta} days`,
				`in ${timeDelta} weeks`,
				`in ${timeDelta} months`,
				`${timeDelta} days ago`,
				`${timeDelta} weeks ago`,
				`${timeDelta} months ago`,
			].filter((item) => item.toLowerCase().startsWith(query));
		} else {
			suggestions = ["Today", "Yesterday", "Tomorrow"].filter((item) =>
				item.toLowerCase().startsWith(query)
			);
		}
		return suggestions.length ? suggestions : [query];
	}

	renderSuggestion(suggestion: string, el: HTMLElement) {
		el.createEl("div", { text: suggestion });
	}

	onChooseSuggestion(suggestion: string) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const nldatesPlugin = (<any>this.app).plugins.getPlugin(
			"nldates-obsidian"
		);
		if (!nldatesPlugin) {
			new Notice("Please enable Natural Language Dates plugin");
			return;
		}

		const parsedDate = nldatesPlugin.parseDate(suggestion);
		const date = parsedDate.moment;
		if (!parsedDate.date) {
			new Notice("Unable to parse date");
			return;
		}

		// Open or create daily note
		let dailyNotes = getAllDailyNotes();
		const file = getDailyNote(date, dailyNotes);
		const leaf = this.app.workspace.getLeaf();
		if (!file) {
			createDailyNote(date).then((newFile) => {
				leaf.openFile(newFile);
			});
		} else {
			leaf.openFile(file);
		}
	}
}
