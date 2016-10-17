export class RandomUtils {
  public static getNumber(min: number, max: number) {
    let r = min + Math.round(Math.random() * (max - min));
    return r;
  }

  public static getList<T>(list: T[], maxAmount?: number, maxTrial:number = 4): T[] {
    if (!list || list.length == 0)
      return [];

    var amount = maxAmount || list.length;
    if (amount > list.length)
      amount = list.length;
    amount = RandomUtils.getNumber(1, amount);
    var indexes: number[] = [];
    var maxIndex = list.length - 1;
    for (let i = 0; i < amount; i++) {
      var index: number;
      var trial = 0;
      do {
        index = RandomUtils.getNumber(0, maxIndex);
        trial++;
      } while (indexes.indexOf(index) >= 0 && trial < maxTrial)
      indexes.push(index);
    }
    var items: T[] = indexes.map(idx => {
      return list[idx];
    })
    return items;
  }

  public static getOne(list: any[]) {
    var index = RandomUtils.getNumber(0, list.length - 1);
    return list[index];
  }
}