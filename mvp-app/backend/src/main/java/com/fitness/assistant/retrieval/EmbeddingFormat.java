package com.fitness.assistant.retrieval;

/**
 * pgvector nhận literal dạng chuỗi "[0.1,0.2,...]" qua cast {@code ?::vector} —
 * không cần thư viện JDBC riêng (com.pgvector:pgvector) chỉ để làm mỗi việc
 * này, và tránh phải đăng ký kiểu vector trên từng connection trong pool.
 */
public final class EmbeddingFormat {

	private EmbeddingFormat() {
	}

	public static String toVectorLiteral(float[] embedding) {
		StringBuilder sb = new StringBuilder("[");
		for (int i = 0; i < embedding.length; i++) {
			if (i > 0) {
				sb.append(',');
			}
			sb.append(embedding[i]);
		}
		return sb.append(']').toString();
	}
}
