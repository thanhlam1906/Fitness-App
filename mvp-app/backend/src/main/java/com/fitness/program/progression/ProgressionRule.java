package com.fitness.program.progression;

import java.util.Optional;

/**
 * Một rule trong thang ưu tiên. Trả rỗng nghĩa là "không khớp, rơi xuống rule
 * kế tiếp". DoubleProgressionRule không bao giờ trả rỗng — nó là rule cuối,
 * đảm bảo engine luôn có quyết định.
 */
public interface ProgressionRule {
	Optional<LoadDecisionResult> evaluate(ProgressionSignal signal);
}
