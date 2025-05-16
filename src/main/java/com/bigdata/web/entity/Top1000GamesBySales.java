package com.bigdata.web.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@TableName("top1000_games_by_sales")
public class Top1000GamesBySales {

  private String title;
  private Double originalPrice;
  private Double reviewCount;
  private Double sales;

}
