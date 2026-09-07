package com.fitness.user;

import java.sql.Types;
import org.hibernate.type.descriptor.jdbc.VarcharJdbcType;

/**
 * V1__init.sql: users.email là citext (không phân biệt hoa thường), không
 * phải varchar. pgjdbc báo kiểu cột đó là Types.OTHER qua JDBC metadata, nên
 * Hibernate ddl-auto=validate báo lệch kiểu nếu field chỉ map String thường
 * (nó kỳ vọng VARCHAR). Bind/extract vẫn phải xử lý như chuỗi bình thường —
 * kế thừa VarcharJdbcType, chỉ đổi type code báo cho validate.
 */
public class CitextJdbcType extends VarcharJdbcType {

	public static final CitextJdbcType INSTANCE = new CitextJdbcType();

	@Override
	public int getJdbcTypeCode() {
		return Types.OTHER;
	}
}
