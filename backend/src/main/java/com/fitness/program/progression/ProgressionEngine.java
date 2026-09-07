package com.fitness.program.progression;

import java.util.List;

/**
 * Duyệt các rule theo THỨ TỰ ƯU TIÊN cố định (kế hoạch chức năng §5.4: Báo
 * đau > Tỉ lệ hoàn thành > RPE > Set trượt rep). Rule đầu tiên khớp thắng và
 * dừng — không cộng dồn nhiều rule, để mọi thay đổi tải giải thích được bằng
 * một câu duy nhất. DoubleProgressionRule luôn khớp nên engine luôn có quyết
 * định, không cần fallback riêng.
 */
public class ProgressionEngine {

	private final List<ProgressionRule> rules = List.of(
			new PainRule(),
			new CompletionRateRule(),
			new RpeRule(),
			new DoubleProgressionRule());

	public LoadDecisionResult decide(ProgressionSignal signal) {
		for (ProgressionRule rule : rules) {
			var result = rule.evaluate(signal);
			if (result.isPresent()) {
				return result.get();
			}
		}
		throw new IllegalStateException(
				"Không rule nào khớp — DoubleProgressionRule phải luôn trả quyết định");
	}
}
