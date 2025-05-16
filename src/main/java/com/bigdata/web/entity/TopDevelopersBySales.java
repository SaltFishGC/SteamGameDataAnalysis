package com.bigdata.web.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@TableName("top_developers_by_sales")
public class TopDevelopersBySales {

  private String developer;
  private Long gameCount;
  private Double avgGoodRate;
  private Double totalSales;

}
