package com.bigdata.web.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@TableName("game_price_goodrate_analysis")
public class GamePriceGoodrateAnalysis {

  private String priceRange;
  private Long gameCount;
  private Double avgGoodRate;
  private Double totalReviewCount;

}
