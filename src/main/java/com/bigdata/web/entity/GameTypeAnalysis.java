package com.bigdata.web.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@TableName("game_type_analysis")
public class GameTypeAnalysis {

  private String type;
  private Long gameCount;
  private Double avgGoodRate;
  private Double totalReviewCount;

}
